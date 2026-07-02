import { SlateTool } from 'slates';
import { z } from 'zod';
import { ChameleonClient } from '../lib/client';
import { spec } from '../spec';

let domainSchema = z.object({
  domainId: z.string().describe('Chameleon domain/URL ID'),
  host: z.string().optional().describe('Domain hostname'),
  domain: z.string().optional().describe('Domain name'),
  enabled: z.boolean().optional().describe('Whether the domain is enabled'),
  urlGroupId: z.string().optional().describe('Associated environment ID'),
  installedAt: z.string().nullable().optional().describe('Installation timestamp'),
  firstSeenAt: z.string().nullable().optional().describe('First seen timestamp'),
  lastSeenAt: z.string().nullable().optional().describe('Last seen timestamp'),
  archivedAt: z.string().nullable().optional().describe('Archive timestamp'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let mapDomain = (d: Record<string, unknown>) => ({
  domainId: d.id as string,
  host: d.host as string | undefined,
  domain: d.domain as string | undefined,
  enabled: d.enabled as boolean | undefined,
  urlGroupId: d.url_group_id as string | undefined,
  installedAt: d.installed_at as string | null | undefined,
  firstSeenAt: d.first_seen_at as string | null | undefined,
  lastSeenAt: d.last_seen_at as string | null | undefined,
  archivedAt: d.archived_at as string | null | undefined,
  createdAt: d.created_at as string | undefined,
  updatedAt: d.updated_at as string | undefined
});

export let manageDomains = SlateTool.create(spec, {
  name: 'Manage Domains',
  key: 'manage_domains',
  description: `List, create, or update approved domains where Chameleon experiences can be displayed.
Domains must be approved before Chameleon content appears on them.`
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update']).describe('Action to perform'),
      // List params
      filterDomain: z.string().optional().describe('Filter domains by domain name'),
      limit: z.number().min(1).max(500).optional().describe('Number of domains to return'),
      before: z.string().optional().describe('Pagination cursor'),
      after: z.string().optional().describe('Pagination cursor'),
      // Create params
      host: z.string().optional().describe('Hostname to approve (for create)'),
      enabled: z.boolean().optional().describe('Whether the domain is enabled'),
      // Update params
      domainId: z.string().optional().describe('Domain ID to update'),
      urlGroupId: z.string().optional().describe('Environment ID to assign'),
      archivedAt: z
        .string()
        .nullable()
        .optional()
        .describe('Set to archive or null to unarchive')
    })
  )
  .output(
    z.object({
      domain: domainSchema.optional().describe('Created or updated domain'),
      domains: z.array(domainSchema).optional().describe('Array of domains'),
      cursor: z
        .object({
          limit: z.number().optional(),
          before: z.string().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ChameleonClient(ctx.auth.token);

    if (ctx.input.action === 'create') {
      let result = await client.createUrl({
        host: ctx.input.host!,
        enabled: ctx.input.enabled !== false
      });
      return {
        output: { domain: mapDomain(result) },
        message: `Domain **${ctx.input.host}** has been created.`
      };
    }

    if (ctx.input.action === 'update') {
      let result = await client.updateUrl(ctx.input.domainId!, {
        enabled: ctx.input.enabled,
        urlGroupId: ctx.input.urlGroupId,
        archivedAt: ctx.input.archivedAt
      });
      return {
        output: { domain: mapDomain(result) },
        message: `Domain **${result.host || result.id}** has been updated.`
      };
    }

    // list
    let result = await client.listUrls({
      domain: ctx.input.filterDomain,
      limit: ctx.input.limit,
      before: ctx.input.before,
      after: ctx.input.after
    });
    let domains = (result.urls || []).map(mapDomain);
    return {
      output: { domains, cursor: result.cursor },
      message: `Returned **${domains.length}** domains.`
    };
  })
  .build();
