import { SlateTool } from 'slates';
import { z } from 'zod';
import { NerdGraphClient, requireEntitySearchQuery } from '../lib/client';
import { spec } from '../spec';

let entitySchema = z.object({
  entityGuid: z.string().describe('Unique entity GUID'),
  name: z.string().describe('Entity name'),
  entityType: z.string().optional().describe('Entity type, e.g. APPLICATION, HOST, DASHBOARD'),
  domain: z.string().optional().describe('Entity domain, e.g. APM, INFRA, BROWSER'),
  type: z.string().optional().describe('Specific entity type'),
  reporting: z.boolean().optional().describe('Whether the entity is currently reporting data'),
  alertSeverity: z.string().optional().describe('Current alert severity on the entity'),
  permalink: z.string().optional().describe('Direct link to the entity in New Relic UI'),
  tags: z
    .array(
      z.object({
        key: z.string(),
        values: z.array(z.string())
      })
    )
    .optional()
    .describe('Tags assigned to the entity'),
  accountId: z.string().optional().describe('Account ID the entity belongs to'),
  accountName: z.string().optional().describe('Account name the entity belongs to')
});

export let searchEntities = SlateTool.create(spec, {
  name: 'Search Entities',
  key: 'search_entities',
  description: `Search and discover entities monitored by New Relic. Entities include applications, hosts, services, dashboards, and cloud integrations.
Use a query string with New Relic entity search syntax. Supports filtering by type, domain, name, tags, and alert severity.`,
  instructions: [
    "Query syntax examples: `name LIKE 'my-app'`, `type = 'APPLICATION'`, `domain = 'APM'`, `tags.environment = 'production'`.",
    'Combine conditions with `AND`/`OR`. A non-empty query is required unless `entityGuid` is provided.',
    'Use `entityGuid` to provide an exact entity GUID to get detailed information about a specific entity.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe(
          'Non-empty entity search query using New Relic entity search syntax. Required when entityGuid is not provided.'
        ),
      entityGuid: z
        .string()
        .optional()
        .describe('Specific entity GUID to retrieve detailed information'),
      cursor: z
        .string()
        .optional()
        .describe('Pagination cursor for fetching the next page of results')
    })
  )
  .output(
    z.object({
      entities: z.array(entitySchema).describe('List of matching entities'),
      totalCount: z.number().optional().describe('Total count of matching entities'),
      nextCursor: z.string().optional().describe('Cursor for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NerdGraphClient({
      token: ctx.auth.token,
      region: ctx.config.region,
      accountId: ctx.config.accountId
    });

    if (ctx.input.entityGuid) {
      ctx.progress('Fetching entity details...');
      let entity = await client.getEntity(ctx.input.entityGuid);

      if (!entity) {
        return {
          output: { entities: [], totalCount: 0 },
          message: `No entity found with GUID **${ctx.input.entityGuid}**.`
        };
      }

      let mapped = {
        entityGuid: entity.guid,
        name: entity.name,
        entityType: entity.entityType ?? undefined,
        domain: entity.domain ?? undefined,
        type: entity.type ?? undefined,
        reporting: entity.reporting ?? undefined,
        alertSeverity: entity.alertSeverity ?? undefined,
        permalink: entity.permalink ?? undefined,
        tags: entity.tags ?? undefined,
        accountId: entity.account?.id?.toString(),
        accountName: entity.account?.name ?? undefined
      };

      return {
        output: { entities: [mapped], totalCount: 1 },
        message: `Found entity **${entity.name}** (${entity.entityType}).`
      };
    }

    let query = requireEntitySearchQuery(ctx.input.query);
    ctx.progress('Searching entities...');
    let result = await client.searchEntities({
      query,
      cursor: ctx.input.cursor
    });

    let entities = (result?.results?.entities || []).map((e: any) => ({
      entityGuid: e.guid,
      name: e.name,
      entityType: e.entityType ?? undefined,
      domain: e.domain ?? undefined,
      type: e.type ?? undefined,
      reporting: e.reporting ?? undefined,
      alertSeverity: e.alertSeverity ?? undefined,
      permalink: e.permalink ?? undefined,
      tags: e.tags ?? undefined,
      accountId: e.account?.id?.toString(),
      accountName: e.account?.name ?? undefined
    }));

    return {
      output: {
        entities,
        totalCount: result?.count,
        nextCursor: result?.results?.nextCursor || undefined
      },
      message: `Found **${result?.count || 0}** entities. Returned **${entities.length}** in this page.`
    };
  })
  .build();
