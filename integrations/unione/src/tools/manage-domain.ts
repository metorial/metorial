import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let dnsRecordSchema = z.object({
  type: z.string().optional().describe('DNS record type (e.g., TXT, CNAME)'),
  host: z.string().optional().describe('DNS record host/name'),
  value: z.string().optional().describe('DNS record value'),
  status: z.string().optional().describe('Verification status of the record')
});

let domainInfoSchema = z.object({
  domain: z.string().describe('Domain name'),
  verificationRecord: dnsRecordSchema.optional().describe('TXT verification record'),
  dkim: dnsRecordSchema.optional().describe('DKIM DNS record'),
  spf: dnsRecordSchema.optional().describe('SPF include record'),
  status: z.string().optional().describe('Overall domain status')
});

// ── Get Domain DNS Records ──

export let getDomainDnsRecords = SlateTool.create(spec, {
  name: 'Get Domain DNS Records',
  key: 'get_domain_dns_records',
  description: `Retrieve the required DNS records for verifying a sender domain. Returns the TXT verification record, DKIM key, and SPF include that need to be added to your DNS configuration.
Use this as the first step when setting up a new sender domain.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name to get DNS records for')
    })
  )
  .output(domainInfoSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      datacenter: ctx.config.datacenter
    });

    let result = await client.getDomainDnsRecords(ctx.input.domain);

    return {
      output: {
        domain: result.domain ?? ctx.input.domain,
        verificationRecord: result.verification_record
          ? {
              type: result.verification_record.type,
              host: result.verification_record.host,
              value: result.verification_record.value,
              status: result.verification_record.status
            }
          : undefined,
        dkim: result.dkim
          ? {
              type: result.dkim.type,
              host: result.dkim.host,
              value: result.dkim.value,
              status: result.dkim.status
            }
          : undefined,
        spf: result.spf
          ? {
              type: result.spf.type,
              host: result.spf.host,
              value: result.spf.value,
              status: result.spf.status
            }
          : undefined,
        status: result.status
      },
      message: `DNS records retrieved for **${ctx.input.domain}**.`
    };
  })
  .build();

// ── Validate Domain ──

export let validateDomain = SlateTool.create(spec, {
  name: 'Validate Domain',
  key: 'validate_domain',
  description: `Trigger validation of a sender domain's DNS records. Validates the verification TXT record and/or DKIM record. Use after adding the required DNS records to your domain's DNS configuration.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name to validate'),
      validateVerification: z
        .boolean()
        .optional()
        .describe('Validate the TXT verification record (default: true)'),
      validateDkim: z.boolean().optional().describe('Validate the DKIM record (default: true)')
    })
  )
  .output(
    z.object({
      verificationStatus: z
        .string()
        .optional()
        .describe('Result of verification record validation'),
      dkimStatus: z.string().optional().describe('Result of DKIM record validation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      datacenter: ctx.config.datacenter
    });

    let verificationStatus: string | undefined;
    let dkimStatus: string | undefined;

    if (ctx.input.validateVerification !== false) {
      let result = await client.validateVerificationRecord(ctx.input.domain);
      verificationStatus = result.status;
    }

    if (ctx.input.validateDkim !== false) {
      let result = await client.validateDkim(ctx.input.domain);
      dkimStatus = result.status;
    }

    return {
      output: {
        verificationStatus,
        dkimStatus
      },
      message: `Domain **${ctx.input.domain}** validation triggered.${verificationStatus ? ` Verification: ${verificationStatus}.` : ''}${dkimStatus ? ` DKIM: ${dkimStatus}.` : ''}`
    };
  })
  .build();

// ── List Domains ──

export let listDomains = SlateTool.create(spec, {
  name: 'List Domains',
  key: 'list_domains',
  description: `List all registered sender domains with their verification and DKIM status.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      domains: z.array(domainInfoSchema).describe('List of registered domains')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      datacenter: ctx.config.datacenter
    });

    let result = await client.listDomains();

    let domains = (result.domains ?? []).map(d => ({
      domain: d.domain,
      verificationRecord: d.verification_record
        ? {
            type: d.verification_record.type,
            host: d.verification_record.host,
            value: d.verification_record.value,
            status: d.verification_record.status
          }
        : undefined,
      dkim: d.dkim
        ? {
            type: d.dkim.type,
            host: d.dkim.host,
            value: d.dkim.value,
            status: d.dkim.status
          }
        : undefined,
      spf: d.spf
        ? {
            type: d.spf.type,
            host: d.spf.host,
            value: d.spf.value,
            status: d.spf.status
          }
        : undefined,
      status: d.status
    }));

    return {
      output: { domains },
      message: `Found **${domains.length}** registered domain(s).`
    };
  })
  .build();

// ── Delete Domain ──

export let deleteDomain = SlateTool.create(spec, {
  name: 'Delete Domain',
  key: 'delete_domain',
  description: `Remove a sender domain from the account. This is permanent and the domain will no longer be usable for sending.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the domain was deleted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      datacenter: ctx.config.datacenter
    });

    let result = await client.deleteDomain(ctx.input.domain);

    return {
      output: { success: result.status === 'success' },
      message: `Domain **${ctx.input.domain}** deleted.`
    };
  })
  .build();
