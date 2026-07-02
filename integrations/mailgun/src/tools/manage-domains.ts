import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailgunClient } from '../lib/client';
import { spec } from '../spec';

let domainSchema = z.object({
  domainId: z.string().optional().describe('Domain ID'),
  name: z.string().describe('Domain name'),
  state: z.string().describe('Domain state (e.g. active, unverified, disabled)'),
  type: z.string().optional().describe('Domain type'),
  spamAction: z.string().optional().describe('Spam action setting'),
  wildcard: z.boolean().optional().describe('Whether wildcard is enabled'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  webScheme: z.string().optional().describe('Web scheme (http or https)')
});

let dnsRecordSchema = z.object({
  recordType: z.string().describe('DNS record type (TXT, CNAME, MX)'),
  valid: z.string().describe('Validation status'),
  name: z.string().describe('DNS record name'),
  value: z.string().describe('DNS record value'),
  priority: z.string().optional().describe('Priority for MX records')
});

export let listDomains = SlateTool.create(spec, {
  name: 'List Domains',
  key: 'list_domains',
  description: `List all sending domains in the Mailgun account. Returns domain names, states, and configuration. Use to discover available domains for sending or to check domain verification status.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Maximum number of domains to return (default 100, max 1000)'),
      skip: z.number().optional().describe('Number of domains to skip for pagination'),
      state: z
        .enum(['active', 'unverified', 'disabled'])
        .optional()
        .describe('Filter by domain state')
    })
  )
  .output(
    z.object({
      domains: z.array(domainSchema),
      totalCount: z.number().describe('Total number of domains')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.listDomains({
      limit: ctx.input.limit,
      skip: ctx.input.skip,
      state: ctx.input.state
    });

    let domains = (result.items || []).map(d => ({
      domainId: d.id,
      name: d.name,
      state: d.state,
      type: d.type,
      spamAction: d.spam_action,
      wildcard: d.wildcard,
      createdAt: d.created_at,
      webScheme: d.web_scheme
    }));

    return {
      output: { domains, totalCount: result.total_count },
      message: `Found **${result.total_count}** domain(s). Returned ${domains.length} domain(s).`
    };
  })
  .build();

export let getDomain = SlateTool.create(spec, {
  name: 'Get Domain',
  key: 'get_domain',
  description: `Get detailed information about a specific domain including DNS records and verification status. Use to check if DNS is properly configured for sending.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      domainName: z.string().describe('The domain name to look up')
    })
  )
  .output(
    z.object({
      domain: domainSchema,
      sendingDnsRecords: z.array(dnsRecordSchema).describe('SPF and DKIM DNS records'),
      receivingDnsRecords: z.array(dnsRecordSchema).describe('MX DNS records for receiving')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.getDomain(ctx.input.domainName);

    let mapDnsRecords = (records: typeof result.sending_dns_records) =>
      (records || []).map(r => ({
        recordType: r.record_type,
        valid: r.valid,
        name: r.name,
        value: r.value,
        priority: r.priority
      }));

    return {
      output: {
        domain: {
          domainId: result.domain.id,
          name: result.domain.name,
          state: result.domain.state,
          type: result.domain.type,
          spamAction: result.domain.spam_action,
          wildcard: result.domain.wildcard,
          createdAt: result.domain.created_at,
          webScheme: result.domain.web_scheme
        },
        sendingDnsRecords: mapDnsRecords(result.sending_dns_records),
        receivingDnsRecords: mapDnsRecords(result.receiving_dns_records)
      },
      message: `Domain **${result.domain.name}** is **${result.domain.state}**.`
    };
  })
  .build();

export let createDomain = SlateTool.create(spec, {
  name: 'Create Domain',
  key: 'create_domain',
  description: `Create a new sending domain in Mailgun. Returns the domain details and DNS records that need to be configured. After creation, set up the returned DNS records and use the verify domain tool to complete setup.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Domain name to create (e.g. "mg.example.com")'),
      spamAction: z
        .enum(['disabled', 'block', 'tag'])
        .optional()
        .describe('What to do with spam (default: disabled)'),
      wildcard: z.boolean().optional().describe('Enable wildcard domain'),
      forceDkimAuthority: z.boolean().optional().describe('Force DKIM authority'),
      dkimKeySize: z.enum(['1024', '2048']).optional().describe('DKIM key size'),
      webScheme: z.enum(['http', 'https']).optional().describe('Web scheme for tracking URLs')
    })
  )
  .output(
    z.object({
      domain: domainSchema,
      sendingDnsRecords: z.array(dnsRecordSchema),
      receivingDnsRecords: z.array(dnsRecordSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.createDomain({
      name: ctx.input.name,
      spamAction: ctx.input.spamAction,
      wildcard: ctx.input.wildcard,
      forceDkimAuthority: ctx.input.forceDkimAuthority,
      dkimKeySize: ctx.input.dkimKeySize ? Number(ctx.input.dkimKeySize) : undefined,
      webScheme: ctx.input.webScheme
    });

    let mapDnsRecords = (records: typeof result.sending_dns_records) =>
      (records || []).map(r => ({
        recordType: r.record_type,
        valid: r.valid,
        name: r.name,
        value: r.value,
        priority: r.priority
      }));

    return {
      output: {
        domain: {
          domainId: result.domain.id,
          name: result.domain.name,
          state: result.domain.state,
          type: result.domain.type,
          spamAction: result.domain.spam_action,
          wildcard: result.domain.wildcard,
          createdAt: result.domain.created_at,
          webScheme: result.domain.web_scheme
        },
        sendingDnsRecords: mapDnsRecords(result.sending_dns_records),
        receivingDnsRecords: mapDnsRecords(result.receiving_dns_records)
      },
      message: `Domain **${result.domain.name}** created. Configure the returned DNS records and verify to start sending.`
    };
  })
  .build();

export let deleteDomain = SlateTool.create(spec, {
  name: 'Delete Domain',
  key: 'delete_domain',
  description: `Delete a sending domain from Mailgun. This permanently removes the domain and all associated data.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      domainName: z.string().describe('Domain name to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    await client.deleteDomain(ctx.input.domainName);

    return {
      output: { success: true },
      message: `Domain **${ctx.input.domainName}** deleted.`
    };
  })
  .build();

export let verifyDomain = SlateTool.create(spec, {
  name: 'Verify Domain',
  key: 'verify_domain',
  description: `Trigger DNS verification for a domain. Run this after configuring DNS records to verify SPF, DKIM, and MX settings. Returns the current verification status of each DNS record.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      domainName: z.string().describe('Domain name to verify')
    })
  )
  .output(
    z.object({
      domain: domainSchema,
      sendingDnsRecords: z.array(dnsRecordSchema),
      receivingDnsRecords: z.array(dnsRecordSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.verifyDomain(ctx.input.domainName);

    let mapDnsRecords = (records: typeof result.sending_dns_records) =>
      (records || []).map(r => ({
        recordType: r.record_type,
        valid: r.valid,
        name: r.name,
        value: r.value,
        priority: r.priority
      }));

    return {
      output: {
        domain: {
          domainId: result.domain.id,
          name: result.domain.name,
          state: result.domain.state,
          type: result.domain.type,
          spamAction: result.domain.spam_action,
          wildcard: result.domain.wildcard,
          createdAt: result.domain.created_at,
          webScheme: result.domain.web_scheme
        },
        sendingDnsRecords: mapDnsRecords(result.sending_dns_records),
        receivingDnsRecords: mapDnsRecords(result.receiving_dns_records)
      },
      message: `Domain **${result.domain.name}** verification triggered. State: **${result.domain.state}**.`
    };
  })
  .build();
