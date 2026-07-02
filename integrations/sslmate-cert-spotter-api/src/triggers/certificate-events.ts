import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let endpointSchema = z.object({
  dnsName: z.string().describe('DNS name of the affected endpoint'),
  monitoredDomain: z.string().describe('The matching monitored domain'),
  wildcard: z.boolean().optional().describe('Whether this is a wildcard match')
});

let issuanceDetailSchema = z.object({
  tbsSha256: z.string().optional().describe('SHA-256 digest of the TBSCertificate'),
  certSha256: z.string().optional().describe('SHA-256 fingerprint of the certificate'),
  dnsNames: z.array(z.string()).optional().describe('DNS names the certificate is valid for'),
  pubkeySha256: z.string().optional().describe('SHA-256 digest of the subject public key'),
  notBefore: z.string().optional().describe('Certificate validity start date'),
  notAfter: z.string().optional().describe('Certificate expiration date'),
  issuerFriendlyName: z
    .string()
    .optional()
    .describe('Human-friendly name of the certificate authority')
});

interface WebhookIssuancePayload {
  tbs_sha256?: string;
  cert_sha256?: string;
  dns_names?: string[];
  pubkey_sha256?: string;
  not_before?: string;
  not_after?: string;
  issuer?: {
    friendly_name?: string;
  };
}

export let certificateEvents = SlateTrigger.create(spec, {
  name: 'Certificate Events',
  key: 'certificate_events',
  description:
    'Receives webhook notifications from Cert Spotter when unknown certificates are detected or new endpoints are discovered for your monitored domains.'
})
  .input(
    z.object({
      eventType: z
        .enum(['unknown_certificate', 'new_endpoint'])
        .describe('Type of certificate event'),
      idempotencyKey: z.string().describe('Unique key for deduplication'),
      unknownCertificate: z
        .object({
          issuanceId: z.string(),
          htmlUrl: z.string(),
          endpoints: z.array(
            z.object({
              dns_name: z.string(),
              monitored_domain: z.string(),
              wildcard: z.boolean().optional()
            })
          ),
          issuance: z.record(z.string(), z.any()).optional()
        })
        .optional()
        .describe('Unknown certificate event payload'),
      newEndpoint: z
        .object({
          dnsName: z.string(),
          monitoredDomain: z.string(),
          htmlUrl: z.string()
        })
        .optional()
        .describe('New endpoint event payload')
    })
  )
  .output(
    z.object({
      eventType: z.string().describe('Type of event: "unknown_certificate" or "new_endpoint"'),
      htmlUrl: z.string().describe('URL to view details in Cert Spotter'),
      endpoints: z
        .array(endpointSchema)
        .optional()
        .describe('Affected endpoints (unknown certificate events)'),
      issuance: issuanceDetailSchema
        .optional()
        .describe('Certificate issuance details (unknown certificate events)'),
      dnsName: z.string().optional().describe('Discovered DNS name (new endpoint events)'),
      monitoredDomain: z.string().optional().describe('Matching monitored domain')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;
      let idempotencyKey = ctx.request.headers.get('Idempotency-Key') || '';

      // Determine event type based on payload shape
      if ('issuance' in data || 'endpoints' in data) {
        let endpoints = (data.endpoints as Record<string, unknown>[]) || [];
        let issuance = data.issuance as Record<string, unknown> | undefined;
        return {
          inputs: [
            {
              eventType: 'unknown_certificate' as const,
              idempotencyKey: idempotencyKey || String(data.id || crypto.randomUUID()),
              unknownCertificate: {
                issuanceId: String(data.id || ''),
                htmlUrl: String(data.html_url || ''),
                endpoints: endpoints.map(ep => ({
                  dns_name: String(ep.dns_name || ''),
                  monitored_domain: String(ep.monitored_domain || ''),
                  wildcard: ep.wildcard as boolean | undefined
                })),
                issuance: issuance as Record<string, any> | undefined
              }
            }
          ]
        };
      }

      // New endpoint event
      return {
        inputs: [
          {
            eventType: 'new_endpoint' as const,
            idempotencyKey:
              idempotencyKey || `${String(data.dns_name)}-${String(data.monitored_domain)}`,
            newEndpoint: {
              dnsName: String(data.dns_name || ''),
              monitoredDomain: String(data.monitored_domain || ''),
              htmlUrl: String(data.html_url || '')
            }
          }
        ]
      };
    },

    handleEvent: async ctx => {
      if (ctx.input.eventType === 'unknown_certificate' && ctx.input.unknownCertificate) {
        let cert = ctx.input.unknownCertificate;
        let issuanceData = (cert.issuance || {}) as WebhookIssuancePayload;

        let endpoints = cert.endpoints.map(ep => ({
          dnsName: ep.dns_name,
          monitoredDomain: ep.monitored_domain,
          wildcard: ep.wildcard
        }));

        return {
          type: 'certificate.unknown_detected',
          id: ctx.input.idempotencyKey,
          output: {
            eventType: 'unknown_certificate' as const,
            htmlUrl: cert.htmlUrl,
            endpoints,
            issuance: {
              tbsSha256: issuanceData.tbs_sha256,
              certSha256: issuanceData.cert_sha256,
              dnsNames: issuanceData.dns_names,
              pubkeySha256: issuanceData.pubkey_sha256,
              notBefore: issuanceData.not_before,
              notAfter: issuanceData.not_after,
              issuerFriendlyName: issuanceData.issuer?.friendly_name
            },
            monitoredDomain: endpoints[0]?.monitoredDomain
          }
        };
      }

      // New endpoint event
      let ep = ctx.input.newEndpoint!;
      return {
        type: 'endpoint.discovered',
        id: ctx.input.idempotencyKey,
        output: {
          eventType: 'new_endpoint' as const,
          htmlUrl: ep.htmlUrl,
          dnsName: ep.dnsName,
          monitoredDomain: ep.monitoredDomain
        }
      };
    }
  })
  .build();
