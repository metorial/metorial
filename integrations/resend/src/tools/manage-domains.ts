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

let domainOutputSchema = z.object({
  domainId: z.string().describe('ID of the domain.'),
  name: z.string().optional().describe('Domain name.'),
  status: z.string().optional().describe('Verification status.'),
  region: z.string().optional().describe('AWS region.'),
  createdAt: z.string().optional().describe('Creation timestamp.'),
  records: z
    .array(dnsRecordSchema)
    .optional()
    .nullable()
    .describe('DNS records for verification.')
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
      tls: z.enum(['opportunistic', 'enforced']).optional().describe('TLS enforcement level.')
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
      tls: ctx.input.tls
    });

    return {
      output: {
        domainId: result.id,
        name: result.name,
        status: result.status,
        region: result.region,
        createdAt: result.created_at,
        records: result.records
      },
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
      output: {
        domainId: result.id,
        name: result.name,
        status: result.status,
        region: result.region,
        createdAt: result.created_at,
        records: result.records
      },
      message: `Domain **${result.name}** — status: **${result.status}**.`
    };
  })
  .build();

export let updateDomain = SlateTool.create(spec, {
  name: 'Update Domain',
  key: 'update_domain',
  description: `Update a domain's tracking and TLS settings.`,
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
      tls: z.enum(['opportunistic', 'enforced']).optional().describe('TLS enforcement level.')
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
      tls: ctx.input.tls
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
            createdAt: z.string().optional().describe('Creation timestamp.')
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
      createdAt: d.created_at
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
