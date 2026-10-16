import { SlateTool } from 'slates';
import { z } from 'zod';
import { AblyRestClient } from '../lib/client';
import { validateInteger } from '../lib/validation';
import { spec } from '../spec';

export let requestToken = SlateTool.create(spec, {
  name: 'Request Token',
  key: 'request_token',
  description: `Issue a short-lived Ably token with fine-grained capabilities for client authentication. Tokens can be scoped to specific channels, operations, and client identities.
Use this to generate tokens for client-side applications instead of exposing your API key.`,
  instructions: [
    'Requires API Key authentication.',
    'The keyName is the part of the API key before the colon (e.g. "I2E_JQ.OqUdfg" from key "I2E_JQ.OqUdfg:keyValue").',
    'Capabilities define what the token can do: a map of channel names/patterns to arrays of operations (publish, subscribe, presence, history, etc.).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      keyName: z
        .string()
        .describe(
          'The key name portion of the API key (appId.keyId format, e.g. "I2E_JQ.OqUdfg")'
        ),
      ttl: z
        .number()
        .optional()
        .describe(
          'Time to live in milliseconds. Default is 60 minutes (3600000 ms). Maximum is 24 hours, or one hour for revocable tokens.'
        ),
      capability: z
        .record(z.string(), z.array(z.string()))
        .optional()
        .describe(
          'Capabilities map: channel name/pattern -> array of operations (publish, subscribe, presence, history, push-subscribe, push-admin, channel-metadata, stats). Grant stats on the wildcard resource "*", for example {"*":["stats"]}.'
        ),
      clientId: z
        .string()
        .optional()
        .describe(
          'Client ID to bind to the token. When set, the token can only be used by this client.'
        )
    })
  )
  .output(
    z.object({
      raw: z.any().optional().describe('Complete issued token details returned by Ably'),
      tokenValue: z.string().describe('The issued token string'),
      keyName: z.string().describe('Key name the token was issued from'),
      issued: z.number().describe('Token issuance timestamp in milliseconds'),
      expires: z.number().describe('Token expiration timestamp in milliseconds'),
      capability: z.string().describe('JSON string of granted capabilities'),
      clientId: z.string().optional().describe('Bound client ID, if any')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AblyRestClient(ctx.auth.token, ctx.auth.authType);

    validateInteger('ttl', ctx.input.ttl, 1, 86400000);
    let result = await client.requestToken(ctx.input.keyName, {
      ttl: ctx.input.ttl,
      capability: ctx.input.capability,
      clientId: ctx.input.clientId
    });

    return {
      output: {
        raw: result,
        tokenValue: result.token,
        keyName: result.keyName,
        issued: result.issued,
        expires: result.expires,
        capability: result.capability,
        clientId: result.clientId
      },
      message: `Issued token from key **${ctx.input.keyName}**, expires at ${new Date(result.expires).toISOString()}.`
    };
  })
  .build();
