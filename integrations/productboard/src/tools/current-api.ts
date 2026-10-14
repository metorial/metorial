import { anyOf, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEntityConfigurationsTool = SlateTool.create(spec, {
  name: 'List Entity Configurations',
  key: 'list_entity_configurations',
  description:
    'Discover the entity types available in this workspace and their supported fields, filters, and validation rules using the current Productboard API. Use the returned types with list_entities.',
  tags: { readOnly: true }
})
  .scopes(anyOf('entities:read'))
  .input(
    z.object({
      types: z.array(z.string()).optional().describe('Optional entity types to inspect'),
      pageCursor: z.string().optional().describe('Cursor returned by the previous call')
    })
  )
  .output(
    z.object({
      configurations: z.array(z.record(z.string(), z.unknown())),
      pageCursor: z.string().optional().describe('Cursor for the next page, when available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listEntityConfigurations(ctx.input);
    return {
      output: { configurations: result.data, pageCursor: result.pageCursor },
      message: `Retrieved ${result.data.length} entity configuration(s).`
    };
  })
  .build();

export let listEntitiesTool = SlateTool.create(spec, {
  name: 'List Entities',
  key: 'list_entities',
  description:
    'List current Productboard entities, including their IDs, types, fields, and links. Call list_entity_configurations to discover available types and filters. Pagination returns one page at a time; request the next page with pageCursor.',
  tags: { readOnly: true }
})
  .scopes(anyOf('entities:read'))
  .input(
    z.object({
      types: z
        .array(z.string())
        .optional()
        .describe(
          'Types returned by list_entity_configurations, such as feature, company, or objective'
        ),
      pageCursor: z.string().optional().describe('Cursor returned by the previous call'),
      name: z.string().optional().describe('Filter by entity name'),
      archived: z.boolean().optional().describe('Filter by archived state'),
      parentId: z
        .string()
        .optional()
        .describe('Filter by parent entity ID, where supported by the entity configuration'),
      fields: z
        .array(z.string())
        .optional()
        .describe(
          'Field names to return; use ["all"] to also include fields with empty values'
        )
    })
  )
  .output(
    z.object({
      entities: z.array(z.record(z.string(), z.unknown())),
      pageCursor: z.string().optional().describe('Cursor for the next page, when available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listEntities(ctx.input);
    return {
      output: { entities: result.data, pageCursor: result.pageCursor },
      message: `Retrieved ${result.data.length} entity record(s).`
    };
  })
  .build();

export let getCurrentUserTool = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Inspect the user, workspace, application, and granted scopes for the current OAuth connection. Requires an OAuth connection; API token connections do not support this operation.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      profile: z.object({
        applicationId: z.string(),
        user: z.object({ name: z.string().optional(), email: z.string().optional() }),
        workspace: z.object({ name: z.string(), domain: z.string() }),
        scopes: z.array(z.string()),
        expiresIn: z.number()
      })
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.auth.authenticationMethod === 'api_token' ||
      (ctx.auth.authenticationMethod !== 'oauth' && !ctx.auth.refreshToken)
    ) {
      throw createApiServiceError(
        'get_current_user requires an OAuth connection. Reconnect using OAuth to inspect the current user.',
        { reason: 'oauth_connection_required' }
      );
    }
    let client = new Client({ token: ctx.auth.token });
    let profile = await client.getCurrentUser();
    return {
      output: { profile },
      message: `Retrieved the OAuth connection profile for workspace **${profile.workspace.name}**.`
    };
  })
  .build();
