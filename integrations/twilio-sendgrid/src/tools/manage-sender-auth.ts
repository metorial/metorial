import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let dnsRecordSchema = z.object({
  valid: z.boolean().describe('Whether this DNS record is valid'),
  type: z.string().optional().describe('DNS record type'),
  host: z.string().optional().describe('DNS hostname'),
  data: z.string().optional().describe('DNS record data/value')
});

let domainSchema = z.object({
  domainId: z.number().describe('Domain authentication ID'),
  domain: z.string().describe('Domain name'),
  subdomain: z.string().optional().describe('Subdomain used for authentication'),
  valid: z.boolean().describe('Whether the domain is fully authenticated'),
  automaticSecurity: z.boolean().optional().describe('Whether automatic security is enabled'),
  dnsRecords: z
    .record(z.string(), dnsRecordSchema)
    .optional()
    .describe('DNS records required for authentication')
});

export let getAuthenticatedDomains = SlateTool.create(spec, {
  name: 'Get Authenticated Domains',
  key: 'get_authenticated_domains',
  description: `List all authenticated (whitelabeled) domains in your SendGrid account. Shows DKIM and SPF authentication status, required DNS records, and configuration details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of domains to return'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      domains: z.array(domainSchema).describe('Authenticated domains')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let results = await client.getAuthenticatedDomains(ctx.input.limit, ctx.input.offset);

    let domains = (Array.isArray(results) ? results : []).map((d: any) => ({
      domainId: d.id,
      domain: d.domain,
      subdomain: d.subdomain || undefined,
      valid: d.valid || false,
      automaticSecurity: d.automatic_security ?? undefined,
      dnsRecords: d.dns
        ? Object.fromEntries(
            Object.entries(d.dns).map(([key, val]: [string, any]) => [
              key,
              {
                valid: val.valid || false,
                type: val.type || undefined,
                host: val.host || undefined,
                data: val.data || undefined
              }
            ])
          )
        : undefined
    }));

    return {
      output: { domains },
      message: `Retrieved **${domains.length}** authenticated domain(s).`
    };
  })
  .build();

export let authenticateDomain = SlateTool.create(spec, {
  name: 'Authenticate Domain',
  key: 'authenticate_domain',
  description: `Start domain authentication (DKIM/SPF) for a new domain. Returns the DNS records you need to add to your domain's DNS settings. After adding records, use **Validate Domain** to verify.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      domain: z.string().describe('Domain to authenticate (e.g. "example.com")'),
      subdomain: z
        .string()
        .optional()
        .describe('Subdomain to use (e.g. "em" results in em.example.com)'),
      automaticSecurity: z
        .boolean()
        .optional()
        .describe('Enable automatic security features (DKIM key rotation, etc.)')
    })
  )
  .output(domainSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let d = await client.authenticateDomain(
      ctx.input.domain,
      ctx.input.subdomain,
      ctx.input.automaticSecurity
    );

    return {
      output: {
        domainId: d.id,
        domain: d.domain,
        subdomain: d.subdomain || undefined,
        valid: d.valid || false,
        automaticSecurity: d.automatic_security ?? undefined,
        dnsRecords: d.dns
          ? Object.fromEntries(
              Object.entries(d.dns).map(([key, val]: [string, any]) => [
                key,
                {
                  valid: val.valid || false,
                  type: val.type || undefined,
                  host: val.host || undefined,
                  data: val.data || undefined
                }
              ])
            )
          : undefined
      },
      message: `Initiated domain authentication for **${d.domain}**. Add the provided DNS records to your domain's DNS settings, then validate.`
    };
  })
  .build();

export let validateDomain = SlateTool.create(spec, {
  name: 'Validate Domain',
  key: 'validate_domain',
  description: `Validate an authenticated domain by checking that the required DNS records are correctly configured. Run this after adding DNS records from the Authenticate Domain step.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domainId: z.number().describe('Domain authentication ID to validate')
    })
  )
  .output(
    z.object({
      domainId: z.number().describe('Domain authentication ID'),
      valid: z.boolean().describe('Whether all DNS records are valid'),
      validationResults: z
        .record(
          z.string(),
          z.object({
            valid: z.boolean().describe('Whether this specific record is valid'),
            reason: z.string().optional().describe('Reason if validation failed')
          })
        )
        .optional()
        .describe('Per-record validation results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.validateDomain(ctx.input.domainId);

    let validationResults: Record<string, { valid: boolean; reason?: string }> | undefined;
    if (result.validation_results) {
      validationResults = Object.fromEntries(
        Object.entries(result.validation_results).map(([key, val]: [string, any]) => [
          key,
          {
            valid: val.valid || false,
            reason: val.reason || undefined
          }
        ])
      );
    }

    return {
      output: {
        domainId: result.id || ctx.input.domainId,
        valid: result.valid || false,
        validationResults
      },
      message: `Domain validation ${result.valid ? '**passed**' : '**failed**'}. ${!result.valid ? 'Check the validation results for specific DNS record issues.' : 'Domain is fully authenticated.'}`
    };
  })
  .build();
