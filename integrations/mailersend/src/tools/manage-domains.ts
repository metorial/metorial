import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDomains = SlateTool.create(spec, {
  name: 'List Domains',
  key: 'list_domains',
  description: `Retrieve a paginated list of sending domains. Optionally filter by verification status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination.'),
      limit: z
        .number()
        .min(10)
        .max(100)
        .optional()
        .describe('Results per page (10-100, default 25).'),
      verified: z.boolean().optional().describe('Filter by verification status.')
    })
  )
  .output(
    z.object({
      domains: z
        .array(
          z.object({
            domainId: z.string().describe('Domain ID.'),
            name: z.string().describe('Domain name.'),
            isVerified: z.boolean().describe('Whether the domain is verified.'),
            createdAt: z.string().describe('Creation timestamp.'),
            updatedAt: z.string().describe('Last updated timestamp.')
          })
        )
        .describe('List of domains.'),
      total: z.number().describe('Total number of domains.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listDomains({
      page: ctx.input.page,
      limit: ctx.input.limit,
      verified: ctx.input.verified
    });

    let domains = (result.data || []).map((d: Record<string, unknown>) => ({
      domainId: String(d.id || ''),
      name: String(d.name || ''),
      isVerified: Boolean(d.is_verified),
      createdAt: String(d.created_at || ''),
      updatedAt: String(d.updated_at || '')
    }));

    let total = ((result.meta as Record<string, unknown>)?.total as number) ?? domains.length;

    return {
      output: { domains, total },
      message: `Found **${total}** domains. Showing ${domains.length} on this page.`
    };
  })
  .build();

export let getDomain = SlateTool.create(spec, {
  name: 'Get Domain',
  key: 'get_domain',
  description: `Retrieve detailed information about a specific sending domain including its settings and DNS configuration status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domainId: z.string().describe('ID of the domain to retrieve.')
    })
  )
  .output(
    z.object({
      domainId: z.string().describe('Domain ID.'),
      name: z.string().describe('Domain name.'),
      isVerified: z.boolean().describe('Whether the domain is verified.'),
      domainData: z
        .record(z.string(), z.unknown())
        .describe('Full domain data including settings.'),
      dnsRecords: z
        .array(z.record(z.string(), z.unknown()))
        .describe('DNS records for domain configuration.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let [domainResult, dnsResult] = await Promise.all([
      client.getDomain(ctx.input.domainId),
      client.getDomainDnsRecords(ctx.input.domainId)
    ]);

    let d = domainResult.data;

    return {
      output: {
        domainId: String(d.id || ''),
        name: String(d.name || ''),
        isVerified: Boolean(d.is_verified),
        domainData: d,
        dnsRecords: dnsResult.data || []
      },
      message: `Retrieved domain **${d.name}** (\`${d.id}\`). Verified: ${d.is_verified ? 'Yes' : 'No'}.`
    };
  })
  .build();

export let createDomain = SlateTool.create(spec, {
  name: 'Create Domain',
  key: 'create_domain',
  description: `Add a new sending domain to your MailerSend account. After creation, you'll need to configure DNS records (SPF, DKIM, DMARC) and verify the domain before sending.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z
        .string()
        .describe('Domain name to add (e.g., "example.com"). Must be unique and resolvable.'),
      returnPathSubdomain: z
        .string()
        .optional()
        .describe('Custom return path subdomain (alphanumeric).'),
      customTrackingSubdomain: z
        .string()
        .optional()
        .describe('Custom tracking subdomain (alphanumeric).'),
      inboundRoutingSubdomain: z
        .string()
        .optional()
        .describe('Custom inbound routing subdomain (alphanumeric).')
    })
  )
  .output(
    z.object({
      domainId: z.string().describe('ID of the created domain.'),
      name: z.string().describe('Domain name.'),
      domainData: z.record(z.string(), z.unknown()).describe('Full created domain data.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createDomain({
      name: ctx.input.name,
      returnPathSubdomain: ctx.input.returnPathSubdomain,
      customTrackingSubdomain: ctx.input.customTrackingSubdomain,
      inboundRoutingSubdomain: ctx.input.inboundRoutingSubdomain
    });

    let d = result.data;

    return {
      output: {
        domainId: String(d.id || ''),
        name: String(d.name || ''),
        domainData: d
      },
      message: `Domain **${d.name}** created successfully. Configure DNS records and verify before sending.`
    };
  })
  .build();

export let deleteDomain = SlateTool.create(spec, {
  name: 'Delete Domain',
  key: 'delete_domain',
  description: `Permanently remove a sending domain from your MailerSend account. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      domainId: z.string().describe('ID of the domain to delete.')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the domain was successfully deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteDomain(ctx.input.domainId);

    return {
      output: { deleted: true },
      message: `Domain \`${ctx.input.domainId}\` deleted successfully.`
    };
  })
  .build();

export let verifyDomain = SlateTool.create(spec, {
  name: 'Verify Domain',
  key: 'verify_domain',
  description: `Trigger DNS verification for a sending domain. Checks SPF, DKIM, DMARC, MX, and tracking records. Returns the verification status for each record type.`,
  tags: {
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
      verificationResult: z
        .record(z.string(), z.unknown())
        .describe('Verification results showing status of each DNS record type.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.verifyDomain(ctx.input.domainId);

    return {
      output: { verificationResult: result.data },
      message: `Domain verification triggered for \`${ctx.input.domainId}\`.`
    };
  })
  .build();
