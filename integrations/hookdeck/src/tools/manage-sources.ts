import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requireHookdeckInput } from '../lib/errors';
import { spec } from '../spec';

let sourceSchema = z.object({
  sourceId: z.string().describe('Unique source ID'),
  teamId: z.string().describe('Team/project ID'),
  name: z.string().describe('Source name'),
  description: z.string().nullable().optional().describe('Source description'),
  type: z.string().optional().describe('Source type (e.g. WEBHOOK, STRIPE, PUBLISH_API)'),
  url: z.string().describe('Hookdeck URL for receiving events'),
  authenticated: z.boolean().optional().describe('Whether authentication is configured'),
  disabledAt: z.string().nullable().optional().describe('Timestamp if disabled'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let manageSources = SlateTool.create(spec, {
  name: 'Manage Sources',
  key: 'manage_sources',
  description: `Create, update, delete, list, enable, or disable Hookdeck sources. A source represents an inbound endpoint that receives HTTP requests (webhooks). Each source gets a unique Hookdeck URL for receiving events.`,
  instructions: [
    'Use action "list" to browse existing sources. Use "get" to retrieve a specific source by ID.',
    'Use action "create" with a name to create a new source. Optionally specify type and verification.',
    'Use action "enable" or "disable" to toggle a source without deleting it.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete', 'enable', 'disable'])
        .describe('Action to perform'),
      sourceId: z
        .string()
        .optional()
        .describe('Source ID (required for get, update, delete, enable, disable)'),
      name: z
        .string()
        .optional()
        .describe('Source name (required for create, optional for update/list)'),
      description: z.string().optional().describe('Source description'),
      type: z.string().optional().describe('Source type (e.g. WEBHOOK, STRIPE)'),
      verification: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Verification config (e.g. { type: "STRIPE", configs: { webhook_secret_key: "..." } })'
        ),
      limit: z.number().optional().describe('Max results to return (for list)'),
      cursor: z.string().optional().describe('Pagination cursor (for list)')
    })
  )
  .output(
    z.object({
      source: sourceSchema
        .optional()
        .describe('Single source (for get/create/update/enable/disable)'),
      sources: z.array(sourceSchema).optional().describe('List of sources (for list)'),
      deletedId: z.string().optional().describe('ID of the deleted source'),
      nextCursor: z.string().optional().describe('Next pagination cursor'),
      totalCount: z.number().optional().describe('Total count of matching sources')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, apiVersion: ctx.config.apiVersion });

    let mapSource = (s: any) => ({
      sourceId: s.id as string,
      teamId: s.team_id as string,
      name: s.name as string,
      description: (s.description as string | null) ?? null,
      type: s.type as string | undefined,
      url: s.url as string,
      authenticated: s.authenticated as boolean | undefined,
      disabledAt: (s.disabled_at as string | null) ?? null,
      createdAt: s.created_at as string,
      updatedAt: s.updated_at as string
    });

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listSources({
          name: ctx.input.name,
          limit: ctx.input.limit,
          next: ctx.input.cursor
        });
        return {
          output: {
            sources: result.models.map(mapSource),
            totalCount: result.count,
            nextCursor: result.pagination.next
          },
          message: `Listed **${result.models.length}** sources (${result.count} total).`
        };
      }
      case 'get': {
        let sourceId = requireHookdeckInput(ctx.input.sourceId, 'sourceId', 'get');
        let source = await client.getSource(sourceId);
        return {
          output: { source: mapSource(source) },
          message: `Retrieved source **${source.name}** (\`${source.id}\`).`
        };
      }
      case 'create': {
        let name = requireHookdeckInput(ctx.input.name, 'name', 'create');
        let source = await client.createSource({
          name,
          description: ctx.input.description,
          type: ctx.input.type,
          verification: ctx.input.verification
        });
        return {
          output: { source: mapSource(source) },
          message: `Created source **${source.name}** (\`${source.id}\`) with URL: ${source.url}`
        };
      }
      case 'update': {
        let sourceId = requireHookdeckInput(ctx.input.sourceId, 'sourceId', 'update');
        let source = await client.updateSource(sourceId, {
          name: ctx.input.name,
          description: ctx.input.description,
          type: ctx.input.type,
          verification: ctx.input.verification
        });
        return {
          output: { source: mapSource(source) },
          message: `Updated source **${source.name}** (\`${source.id}\`).`
        };
      }
      case 'delete': {
        let sourceId = requireHookdeckInput(ctx.input.sourceId, 'sourceId', 'delete');
        let result = await client.deleteSource(sourceId);
        return {
          output: { deletedId: result.id },
          message: `Deleted source \`${result.id}\`.`
        };
      }
      case 'enable': {
        let sourceId = requireHookdeckInput(ctx.input.sourceId, 'sourceId', 'enable');
        let source = await client.enableSource(sourceId);
        return {
          output: { source: mapSource(source) },
          message: `Enabled source **${source.name}** (\`${source.id}\`).`
        };
      }
      case 'disable': {
        let sourceId = requireHookdeckInput(ctx.input.sourceId, 'sourceId', 'disable');
        let source = await client.disableSource(sourceId);
        return {
          output: { source: mapSource(source) },
          message: `Disabled source **${source.name}** (\`${source.id}\`).`
        };
      }
    }
  })
  .build();
