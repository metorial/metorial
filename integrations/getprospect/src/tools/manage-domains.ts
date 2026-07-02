import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let domainSchema = z.object({
  domainId: z.string().optional().describe('Unique identifier for the domain'),
  name: z.string().optional().describe('Domain name')
});

export let getDomains = SlateTool.create(spec, {
  name: 'Get Domains',
  key: 'get_domains',
  description: `Retrieve a single domain by ID, or list all domains with pagination. Domains are used in email finding and prospecting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domainId: z
        .string()
        .optional()
        .describe('ID of a specific domain to retrieve. If omitted, lists all domains.'),
      page: z.number().optional().describe('Page number for listing'),
      perPage: z.number().optional().describe('Results per page for listing')
    })
  )
  .output(
    z.object({
      domain: domainSchema.optional().describe('Single domain (when domainId is provided)'),
      domains: z.array(domainSchema).optional().describe('List of domains (when listing)'),
      totalCount: z.number().optional().describe('Total count when listing')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.domainId) {
      let result = await client.getDomain(ctx.input.domainId);
      return {
        output: {
          domain: {
            domainId: result.id ?? result.domain_id,
            name: result.name
          }
        },
        message: `Retrieved domain **${result.name ?? ctx.input.domainId}**.`
      };
    }

    let result = await client.getDomains({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let domains = result.data ?? result.domains ?? result ?? [];
    let domainsArray = Array.isArray(domains) ? domains : [];

    return {
      output: {
        domains: domainsArray.map((domain: any) => ({
          domainId: domain.id ?? domain.domain_id,
          name: domain.name
        })),
        totalCount: result.total ?? result.totalCount
      },
      message: `Found **${domainsArray.length}** domain(s).`
    };
  })
  .build();

export let createDomain = SlateTool.create(spec, {
  name: 'Create Domain',
  key: 'create_domain',
  description: `Add a new domain to GetProspect for use in email finding and prospecting.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Domain name (e.g. "example.com")')
    })
  )
  .output(domainSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createDomain({ name: ctx.input.name });

    return {
      output: {
        domainId: result.id ?? result.domain_id,
        name: result.name ?? ctx.input.name
      },
      message: `Created domain **${ctx.input.name}**.`
    };
  })
  .build();

export let deleteDomain = SlateTool.create(spec, {
  name: 'Delete Domain',
  key: 'delete_domain',
  description: `Permanently delete a domain from GetProspect. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      domainId: z.string().describe('ID of the domain to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteDomain(ctx.input.domainId);

    return {
      output: { success: true },
      message: `Deleted domain **${ctx.input.domainId}**.`
    };
  })
  .build();
