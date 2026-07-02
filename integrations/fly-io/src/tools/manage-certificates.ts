import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageCertificates = SlateTool.create(spec, {
  name: 'Manage Certificates',
  key: 'manage_certificates',
  description:
    "List, request, check, or delete SSL/TLS certificates for custom domains on a Fly App. Supports both automatic ACME (Let's Encrypt) certificates and custom certificate imports.",
  instructions: [
    'Use "list" to see all certificates for an app.',
    'Use "get" to retrieve details and validation status for a specific hostname.',
    'Use "request_acme" to request an automatic Let\'s Encrypt certificate for a hostname.',
    'Use "check" to check DNS validation status and diagnostics for a hostname.',
    'Use "delete" to remove all certificates for a hostname.'
  ]
})
  .input(
    z.object({
      appName: z.string().describe('Name of the Fly App'),
      action: z
        .enum(['list', 'get', 'request_acme', 'check', 'delete'])
        .describe('Action to perform'),
      hostname: z
        .string()
        .optional()
        .describe(
          'Hostname/domain for the certificate (required for all actions except list)'
        ),
      filter: z
        .string()
        .optional()
        .describe('Filter certificates by hostname substring (for list)')
    })
  )
  .output(
    z.object({
      certificates: z
        .array(
          z.object({
            hostname: z.string().describe('Hostname'),
            status: z.string().describe('Certificate status'),
            configured: z.boolean().describe('Whether the certificate is fully configured'),
            dnsProvider: z.string().describe('DNS provider')
          })
        )
        .optional()
        .describe('List of certificates (for list action)'),
      certificate: z
        .object({
          hostname: z.string().describe('Hostname'),
          status: z.string().describe('Certificate status'),
          configured: z.boolean().describe('Whether fully configured'),
          dnsProvider: z.string().describe('DNS provider'),
          certificates: z
            .array(
              z.object({
                source: z.string().describe('Certificate source (custom or fly)'),
                status: z.string().describe('Certificate status'),
                expiresAt: z.string().describe('Expiration date')
              })
            )
            .describe('Individual certificate entries'),
          dnsRequirements: z.record(z.string(), z.any()).describe('Required DNS records'),
          validation: z.record(z.string(), z.any()).describe('Validation status details')
        })
        .optional()
        .describe('Certificate details (for get, request_acme, check)'),
      deleted: z.boolean().optional().describe('Whether the certificate was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { appName, action, hostname } = ctx.input;

    switch (action) {
      case 'list': {
        let certs = await client.listCertificates(appName, { filter: ctx.input.filter });
        return {
          output: {
            certificates: certs.map(c => ({
              hostname: c.hostname,
              status: c.status,
              configured: c.configured,
              dnsProvider: c.dnsProvider
            }))
          },
          message: `Found **${certs.length}** certificate(s) for app **${appName}**.`
        };
      }
      case 'get': {
        if (!hostname) throw new Error('hostname is required for get action');
        let cert = await client.getCertificate(appName, hostname);
        return {
          output: { certificate: cert },
          message: `Certificate for **${hostname}** is **${cert.status}**${cert.configured ? ' and fully configured' : ''}.`
        };
      }
      case 'request_acme': {
        if (!hostname) throw new Error('hostname is required for request_acme action');
        let cert = await client.requestAcmeCertificate(appName, hostname);
        return {
          output: { certificate: cert },
          message: `Requested ACME certificate for **${hostname}** — status: **${cert.status}**.`
        };
      }
      case 'check': {
        if (!hostname) throw new Error('hostname is required for check action');
        let cert = await client.checkCertificate(appName, hostname);
        return {
          output: { certificate: cert },
          message: `Certificate check for **${hostname}**: status **${cert.status}**, configured: **${cert.configured}**.`
        };
      }
      case 'delete': {
        if (!hostname) throw new Error('hostname is required for delete action');
        await client.deleteCertificate(appName, hostname);
        return {
          output: { deleted: true },
          message: `Deleted all certificates for **${hostname}** on app **${appName}**.`
        };
      }
    }
  })
  .build();
