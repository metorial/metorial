import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { cloudflareServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageSslCertificatesTool = SlateTool.create(spec, {
  name: 'Manage SSL/TLS Certificates',
  key: 'manage_ssl_certificates',
  description: `View and manage SSL/TLS certificates for a zone. List certificate packs, custom certificates, and Origin CA certificates. Update the zone's SSL/TLS encryption mode. Create or revoke Origin CA certificates.`,
  instructions: [
    'SSL modes: off, flexible, full, strict (full_strict).',
    'Origin CA certificates are used between Cloudflare and your origin server.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list_certificate_packs',
          'list_custom_certificates',
          'list_origin_ca',
          'get_ssl_mode',
          'update_ssl_mode',
          'create_origin_ca',
          'revoke_origin_ca'
        ])
        .describe('Operation to perform'),
      zoneId: z.string().describe('Zone ID'),
      sslMode: z
        .string()
        .optional()
        .describe('SSL/TLS encryption mode (off, flexible, full, strict)'),
      hostnames: z
        .array(z.string())
        .optional()
        .describe('Hostnames for Origin CA certificate'),
      requestedValidity: z
        .number()
        .optional()
        .describe('Certificate validity in days (default 5475 = 15 years)'),
      certificateId: z.string().optional().describe('Certificate ID for revoke operations')
    })
  )
  .output(
    z.object({
      certificates: z
        .array(
          z.object({
            certificateId: z.string(),
            type: z.string().optional(),
            status: z.string().optional(),
            hosts: z.array(z.string()).optional(),
            expiresOn: z.string().optional()
          })
        )
        .optional(),
      sslMode: z.string().optional(),
      certificate: z
        .object({
          certificateId: z.string(),
          certificate: z.string().optional(),
          hostnames: z.array(z.string()).optional(),
          expiresOn: z.string().optional()
        })
        .optional(),
      revoked: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let { action, zoneId } = ctx.input;

    if (action === 'list_certificate_packs') {
      let response = await client.listCertificatePacks(zoneId);
      let certificates = response.result.map((c: any) => ({
        certificateId: c.id,
        type: c.type,
        status: c.status,
        hosts: c.hosts,
        expiresOn: c.certificates?.[0]?.expires_on
      }));
      return {
        output: { certificates },
        message: `Found **${certificates.length}** certificate pack(s).`
      };
    }

    if (action === 'list_custom_certificates') {
      let response = await client.listCustomCertificates(zoneId);
      let certificates = response.result.map((c: any) => ({
        certificateId: c.id,
        type: 'custom',
        status: c.status,
        hosts: c.hosts,
        expiresOn: c.expires_on
      }));
      return {
        output: { certificates },
        message: `Found **${certificates.length}** custom certificate(s).`
      };
    }

    if (action === 'list_origin_ca') {
      let response = await client.listOriginCaCertificates(zoneId);
      let certificates = response.result.map((c: any) => ({
        certificateId: c.id,
        type: 'origin_ca',
        status: c.status || 'active',
        hosts: c.hostnames,
        expiresOn: c.expires_on
      }));
      return {
        output: { certificates },
        message: `Found **${certificates.length}** Origin CA certificate(s).`
      };
    }

    if (action === 'get_ssl_mode') {
      let response = await client.getSslSetting(zoneId);
      return {
        output: { sslMode: response.result.value },
        message: `SSL/TLS mode: **${response.result.value}**`
      };
    }

    if (action === 'update_ssl_mode') {
      if (!ctx.input.sslMode) throw cloudflareServiceError('sslMode is required');
      await client.updateSslSetting(zoneId, ctx.input.sslMode);
      return {
        output: { sslMode: ctx.input.sslMode },
        message: `Updated SSL/TLS mode to **${ctx.input.sslMode}**.`
      };
    }

    if (action === 'create_origin_ca') {
      if (!ctx.input.hostnames?.length) throw cloudflareServiceError('hostnames are required');
      let response = await client.createOriginCaCertificate({
        hostnames: ctx.input.hostnames,
        requestedValidity: ctx.input.requestedValidity
      });
      let cert = response.result;
      return {
        output: {
          certificate: {
            certificateId: cert.id,
            certificate: cert.certificate,
            hostnames: cert.hostnames,
            expiresOn: cert.expires_on
          }
        },
        message: `Created Origin CA certificate for ${ctx.input.hostnames.join(', ')}.`
      };
    }

    if (action === 'revoke_origin_ca') {
      if (!ctx.input.certificateId) throw cloudflareServiceError('certificateId is required');
      await client.revokeOriginCaCertificate(ctx.input.certificateId);
      return {
        output: { revoked: true },
        message: `Revoked Origin CA certificate \`${ctx.input.certificateId}\`.`
      };
    }

    throw cloudflareServiceError(`Unknown action: ${action}`);
  })
  .build();
