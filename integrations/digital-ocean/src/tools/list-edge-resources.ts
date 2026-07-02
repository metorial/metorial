import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let cdnEndpointSchema = z.object({
  cdnEndpointId: z.string().describe('CDN endpoint ID'),
  origin: z.string().describe('Spaces origin hostname'),
  endpoint: z.string().optional().describe('CDN endpoint hostname'),
  customDomain: z.string().optional().describe('Custom CDN hostname'),
  certificateId: z.string().optional().describe('TLS certificate ID'),
  ttl: z.number().optional().describe('Cache TTL in seconds'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

export let listCdnEndpoints = SlateTool.create(spec, {
  name: 'List CDN Endpoints',
  key: 'list_cdn_endpoints',
  description: `List DigitalOcean CDN endpoints for Spaces origins. Use this to audit edge delivery configuration and find endpoint IDs for cache or custom-domain operations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      endpoints: z.array(cdnEndpointSchema),
      totalCount: z.number().describe('Total number of CDN endpoints')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listCdnEndpoints({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let endpoints = result.endpoints.map((endpoint: any) => ({
      cdnEndpointId: endpoint.id,
      origin: endpoint.origin,
      endpoint: endpoint.endpoint,
      customDomain: endpoint.custom_domain,
      certificateId: endpoint.certificate_id,
      ttl: endpoint.ttl,
      createdAt: endpoint.created_at
    }));

    return {
      output: {
        endpoints,
        totalCount: result.meta?.total || endpoints.length
      },
      message: `Found **${endpoints.length}** CDN endpoint(s).`
    };
  })
  .build();

let certificateSchema = z.object({
  certificateId: z.string().describe('Certificate ID'),
  name: z.string().optional().describe('Certificate name'),
  certificateType: z.string().optional().describe('Certificate type'),
  state: z.string().optional().describe('Certificate state'),
  dnsNames: z.array(z.string()).describe('DNS names on the certificate'),
  sha1Fingerprint: z.string().optional().describe('SHA-1 fingerprint'),
  notAfter: z.string().optional().describe('Expiration timestamp'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

export let listCertificates = SlateTool.create(spec, {
  name: 'List Certificates',
  key: 'list_certificates',
  description: `List DigitalOcean-managed TLS certificates used by load balancers and CDN endpoints. Returns IDs, names, DNS names, state, and expiration information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      certificates: z.array(certificateSchema),
      totalCount: z.number().describe('Total number of certificates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listCertificates({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let certificates = result.certificates.map((certificate: any) => ({
      certificateId: certificate.id,
      name: certificate.name,
      certificateType: certificate.type,
      state: certificate.state,
      dnsNames: certificate.dns_names || [],
      sha1Fingerprint: certificate.sha1_fingerprint,
      notAfter: certificate.not_after,
      createdAt: certificate.created_at
    }));

    return {
      output: {
        certificates,
        totalCount: result.meta?.total || certificates.length
      },
      message: `Found **${certificates.length}** certificate(s).`
    };
  })
  .build();
