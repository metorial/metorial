import { encodeWebhookWireBody } from '@slates/provider';
import { createLocalSlateTestClient, getSlateContract } from '@slates/test';
import { expect, vi } from 'vitest';
import { provider } from '../index';
import { PayPalClient } from '../lib/client';
import { verifyPayPalWebhook } from '../lib/webhook';

export let expectPayPalTriggerContract = async (triggerId: string) => {
  let local = createLocalSlateTestClient({
    slate: provider,
    state: {
      config: {},
      auth: {
        authenticationMethodId: 'client_credentials',
        output: {
          token: 'token',
          clientId: 'client-id',
          clientSecret: 'client-secret',
          environment: 'sandbox'
        }
      }
    }
  });
  let contract = await getSlateContract(local);
  let trigger = contract.triggers.find(action => action.id === triggerId);
  expect(trigger?.invocation).toMatchObject({
    type: 'webhook',
    http: {
      methods: ['POST'],
      ingress: {
        verification: {
          mechanism: 'provider',
          allowedSecretRefs: [
            { source: 'registration', registrationKey: 'webhookId' },
            { source: 'auth_config', credentialKey: 'token' },
            { source: 'auth_config', credentialKey: 'clientId' },
            { source: 'auth_config', credentialKey: 'clientSecret' },
            { source: 'auth_config', credentialKey: 'environment' }
          ],
          rules: [
            {
              verify: { type: 'provider', verifierId: 'paypal.delivery.v1' },
              replay: {
                freshness: { source: 'preset', presetField: 'timestamp' },
                deduplicate: { source: 'preset', presetField: 'delivery_id' }
              }
            }
          ]
        }
      }
    }
  });
  expect(
    trigger?.invocation.type === 'webhook' && trigger.invocation.http?.ingress
  ).toBeTruthy();
  expect(JSON.stringify(trigger)).toContain('paypal_webhook_id');
  expect(trigger?.invocation).toMatchObject({
    type: 'webhook',
    http: {
      ingress: {
        verification: {
          rules: [
            {
              replay: {
                freshness: {
                  presetField: 'timestamp',
                  maxAgeSeconds: 86_400,
                  maxFutureSkewSeconds: 300
                }
              }
            }
          ]
        }
      }
    }
  });

  let createWebhook = vi
    .spyOn(PayPalClient.prototype, 'createWebhook')
    .mockResolvedValue({ id: `${triggerId}-webhook` } as any);
  let registration = await local.registerTriggerWebhook(
    triggerId,
    `https://example.com/${triggerId}`
  );
  expect(registration.capturedSecrets).toEqual({
    paypal_webhook_id: `${triggerId}-webhook`
  });
  createWebhook.mockRestore();

  let verifier = vi
    .spyOn(PayPalClient.prototype, 'verifyWebhookSignature')
    .mockImplementation(async input => ({
      verificationStatus: input.webhookId === `${triggerId}-webhook` ? 'SUCCESS' : 'FAILURE'
    }));
  let baseHeaders: [string, string][] = [
    ['paypal-auth-algo', 'SHA256withRSA'],
    ['paypal-cert-url', 'https://api.paypal.com/cert.pem'],
    ['paypal-transmission-id', `${triggerId}-transmission`],
    ['paypal-transmission-sig', 'signature'],
    ['paypal-transmission-time', '2026-08-15T00:00:00.000Z']
  ];
  let originalRequest = (headers: [string, string][]) => ({
    url: `https://example.com/${triggerId}`,
    method: 'POST' as const,
    headers,
    body: encodeWebhookWireBody(Buffer.from(JSON.stringify({ id: `${triggerId}-event` })))
  });
  let projected = (webhookId: string) => ({
    paypal_webhook_id: { value: webhookId },
    paypal_access_token: { value: 'token' },
    paypal_client_id: { value: 'client-id' },
    paypal_client_secret: { value: 'client-secret' },
    paypal_environment: { value: 'sandbox' }
  });
  await expect(
    verifyPayPalWebhook({
      input: { originalRequest: originalRequest(baseHeaders) },
      secrets: projected('wrong-webhook')
    })
  ).resolves.toMatchObject({ status: 'rejected', code: 'credential_invalid' });
  for (let missing of baseHeaders.map(([name]) => name)) {
    await expect(
      verifyPayPalWebhook({
        input: {
          originalRequest: originalRequest(baseHeaders.filter(([name]) => name !== missing))
        },
        secrets: projected(`${triggerId}-webhook`)
      })
    ).resolves.toMatchObject({ status: 'rejected', code: 'credential_missing' });
  }
  let first = await verifyPayPalWebhook({
    input: { originalRequest: originalRequest(baseHeaders) },
    secrets: projected(`${triggerId}-webhook`)
  });
  let replay = await verifyPayPalWebhook({
    input: { originalRequest: originalRequest(baseHeaders) },
    secrets: projected(`${triggerId}-webhook`)
  });
  expect(first).toMatchObject({ status: 'accepted' });
  expect(replay).toEqual(first);
  verifier.mockRestore();
};
