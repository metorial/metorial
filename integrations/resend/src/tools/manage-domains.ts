import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let dnsRecordSchema = z.object({
  record: z.string().optional().describe('Record purpose (e.g., SPF, DKIM).'),
  name: z.string().optional().describe('DNS record name.'),
  type: z.string().optional().describe('DNS record type (MX, TXT, CNAME).'),
  value: z.string().optional().describe('DNS record value.'),
  priority: z.number().optional().nullable().describe('MX record priority.'),
  ttl: z.string().optional().describe('Time to live.'),
  status: z.string().optional().describe('Verification status of this record.')
});

let capabilityStatusSchema = z.enum(['enabled', 'disabled']);

let capabilitiesInputSchema = z
  .object({
    sending: capabilityStatusSchema
      .optional()
      .describe('Enable or disable sending from this domain.'),
    receiving: capabilityStatusSchema
      .optional()
      .describe('Enable or disable receiving inbound email on this domain.')
  })
  .describe(
    'Sending and receiving capabilities for the domain. At least one must stay enabled.'
  );

let capabilitiesOutputSchema = z
  .object({
    sending: z.string().optional().describe('Sending capability status.'),
    receiving: z.string().optional().describe('Receiving capability status.')
  })
  .optional()
  .nullable()
  .describe('Sending and receiving capabilities.');

let domainOutputSchema = z.object({
  domainId: z.string().describe('ID of the domain.'),
  name: z.string().optional().describe('Domain name.'),
  status: z.string().optional().describe('Verification status.'),
  region: z.string().optional().describe('AWS region.'),
  createdAt: z.string().optional().describe('Creation timestamp.'),
  openTracking: z.boolean().optional().nullable().describe('Whether open tracking is on.'),
  clickTracking: z.boolean().optional().nullable().describe('Whether click tracking is on.'),
  trackingSubdomain: z
    .string()
    .optional()
    .nullable()
    .describe('Custom subdomain used for open and click tracking.'),
  capabilities: capabilitiesOutputSchema,
  records: z
    .array(dnsRecordSchema)
    .optional()
    .nullable()
    .describe('DNS records for verification.')
});

let mapDomain = (domain: any) => ({
  domainId: domain.id,
  name: domain.name,
  status: domain.status,
  region: domain.region,
  createdAt: domain.created_at,
  openTracking: domain.open_tracking,
  clickTracking: domain.click_tracking,
  trackingSubdomain: domain.tracking_subdomain,
  capabilities: domain.capabilities,
  records: domain.records
});

export let createDomain = SlateTool.create(spec, {
  name: 'Create Domain',
  key: 'create_domain',
  description: `Register a new sending domain in Resend. Returns the DNS records that need to be added to your domain registrar for verification (DKIM, SPF, DMARC). After adding DNS records, use the **Verify Domain** tool to trigger verification.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Domain name to register (e.g., "example.com").'),
      region: z
        .enum(['us-east-1', 'eu-west-1', 'sa-east-1', 'ap-northeast-1'])
        .optional()
        .describe('AWS region for sending. Defaults to us-east-1.'),
      customReturnPath: z
        .string()
        .optional()
        .describe('Subdomain for Return-Path header. Defaults to "send".'),
      openTracking: z.boolean().optional().describe('Enable open tracking.'),
      clickTracking: z.boolean().optional().describe('Enable click tracking.'),
      trackingSubdomain: z
        .string()
        .optional()
        .describe('Custom subdomain for open and click tracking, such as "links".'),
      tls: z.enum(['opportunistic', 'enforced']).optional().describe('TLS enforcement level.'),
      capabilities: capabilitiesInputSchema
        .optional()
        .describe(
          'Sending and receiving capabilities. Sending defaults to enabled and receiving to disabled.'
        )
    })
  )
  .output(domainOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createDomain({
      name: ctx.input.name,
      region: ctx.input.region,
      customReturnPath: ctx.input.customReturnPath,
      openTracking: ctx.input.openTracking,
      clickTracking: ctx.input.clickTracking,
      trackingSubdomain: ctx.input.trackingSubdomain,
      tls: ctx.input.tls,
      capabilities: ctx.input.capabilities
    });

    return {
      output: mapDomain(result),
      message: `Domain **${result.name}** created with ID \`${result.id}\`. Add the returned DNS records to your registrar, then verify.`
    };
  })
  .build();

export let getDomain = SlateTool.create(spec, {
  name: 'Get Domain',
  key: 'get_domain',
  description: `Retrieve details of a domain including its verification status and DNS records.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domainId: z.string().describe('ID of the domain to retrieve.')
    })
  )
  .output(domainOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getDomain(ctx.input.domainId);

    return {
      output: mapDomain(result),
      message: `Domain **${result.name}** — status: **${result.status}**.`
    };
  })
  .build();

export let updateDomain = SlateTool.create(spec, {
  name: 'Update Domain',
  key: 'update_domain',
  description: `Update a domain's open/click tracking, tracking subdomain, TLS, and sending or receiving capabilities.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      domainId: z.string().describe('ID of the domain to update.'),
      openTracking: z.boolean().optional().describe('Enable or disable open tracking.'),
      clickTracking: z.boolean().optional().describe('Enable or disable click tracking.'),
      trackingSubdomain: z
        .string()
        .optional()
        .describe('Custom subdomain for open and click tracking, such as "links".'),
      tls: z.enum(['opportunistic', 'enforced']).optional().describe('TLS enforcement level.'),
      capabilities: capabilitiesInputSchema
        .optional()
        .describe('Enable or disable sending and inbound receiving for the domain.')
    })
  )
  .output(
    z.object({
      domainId: z.string().describe('ID of the updated domain.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateDomain(ctx.input.domainId, {
      openTracking: ctx.input.openTracking,
      clickTracking: ctx.input.clickTracking,
      trackingSubdomain: ctx.input.trackingSubdomain,
      tls: ctx.input.tls,
      capabilities: ctx.input.capabilities
    });

    return {
      output: { domainId: result.id },
      message: `Domain \`${result.id}\` settings updated.`
    };
  })
  .build();

export let listDomains = SlateTool.create(spec, {
  name: 'List Domains',
  key: 'list_domains',
  description: `List all registered sending domains with their status and region.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max results to return (default 20, max 100).'),
      after: z.string().optional().describe('Cursor for forward pagination.'),
      before: z.string().optional().describe('Cursor for backward pagination.')
    })
  )
  .output(
    z.object({
      domains: z
        .array(
          z.object({
            domainId: z.string().describe('Domain ID.'),
            name: z.string().describe('Domain name.'),
            status: z.string().describe('Verification status.'),
            region: z.string().optional().describe('AWS region.'),
            createdAt: z.string().optional().describe('Creation timestamp.'),
            capabilities: capabilitiesOutputSchema
          })
        )
        .describe('List of domains.'),
      hasMore: z.boolean().describe('Whether more results are available.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listDomains({
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });

    let domains = (result.data || []).map((d: any) => ({
      domainId: d.id,
      name: d.name,
      status: d.status,
      region: d.region,
      createdAt: d.created_at,
      capabilities: d.capabilities
    }));

    return {
      output: {
        domains,
        hasMore: result.has_more ?? false
      },
      message: `Found **${domains.length}** domain(s).`
    };
  })
  .build();

export let verifyDomain = SlateTool.create(spec, {
  name: 'Verify Domain',
  key: 'verify_domain',
  description: `Trigger DNS verification for a domain. The verification process is asynchronous — the domain status will update once records are confirmed.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      domainId: z.string().describe('ID of the domain to verify.')
    })
  )
  .output(
    z.object({
      domainId: z.string().describe('ID of the domain.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.verifyDomain(ctx.input.domainId);

    return {
      output: { domainId: result.id },
      message: `Verification triggered for domain \`${result.id}\`. DNS records are being checked asynchronously.`
    };
  })
  .build();

export let deleteDomain = SlateTool.create(spec, {
  name: 'Delete Domain',
  key: 'delete_domain',
  description: `Remove a sending domain from Resend. This is irreversible and will stop email delivery from this domain.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      domainId: z.string().describe('ID of the domain to delete.')
    })
  )
  .output(
    z.object({
      domainId: z.string().describe('ID of the deleted domain.'),
      deleted: z.boolean().describe('Whether the domain was successfully deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteDomain(ctx.input.domainId);

    return {
      output: {
        domainId: result.id,
        deleted: result.deleted ?? true
      },
      message: `Domain \`${result.id}\` has been **deleted**.`
    };
  })
  .build();
