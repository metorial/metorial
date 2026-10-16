import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { pipelineSchema } from './list-pipelines';
import { connectionOutputSchema } from './manage-connection';

let ownerFields = {
  ownerType: z
    .enum(['user', 'org'])
    .default('user')
    .describe('Whether the resource belongs to a user or organization'),
  ownerHandle: z
    .string()
    .optional()
    .describe(
      'Owner handle. Required for organizations; call list_organizations to discover organization handles. Defaults to the authenticated user for user scope.'
    )
};
let workspaceFields = {
  ...ownerFields,
  workspaceHandle: z
    .string()
    .describe('Workspace handle. Call list_workspaces to discover accessible workspaces.')
};

export let getConnection = SlateTool.create(spec, {
  name: 'Get Connection',
  key: 'get_connection',
  description:
    'Retrieve a user or organization connection. Call list_connections to discover connection handles.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      ...ownerFields,
      connectionHandle: z.string().describe('Connection handle returned by list_connections')
    })
  )
  .output(connectionOutputSchema)
  .handleInvocation(async ctx => {
    let client = Client.fromContext(ctx);
    let ownerHandle = await client.resolveOwner(ctx.input.ownerType, ctx.input.ownerHandle);
    let connection =
      ctx.input.ownerType === 'org'
        ? await client.getOrgConnection(ownerHandle, ctx.input.connectionHandle)
        : await client.getUserConnection(ownerHandle, ctx.input.connectionHandle);
    return { output: connection, message: `Retrieved connection **${connection.handle}**.` };
  })
  .build();

export let getPipeline = SlateTool.create(spec, {
  name: 'Get Pipeline',
  key: 'get_pipeline',
  description:
    'Retrieve a scheduled workspace pipeline. Call list_workspaces and list_pipelines to discover the workspace handle and pipeline ID.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      ...workspaceFields,
      pipelineId: z.string().describe('Pipeline ID returned by list_pipelines')
    })
  )
  .output(pipelineSchema)
  .handleInvocation(async ctx => {
    let client = Client.fromContext(ctx);
    let ownerHandle = await client.resolveOwner(ctx.input.ownerType, ctx.input.ownerHandle);
    let pipeline =
      ctx.input.ownerType === 'org'
        ? await client.getOrgPipeline(
            ownerHandle,
            ctx.input.workspaceHandle,
            ctx.input.pipelineId
          )
        : await client.getUserPipeline(
            ownerHandle,
            ctx.input.workspaceHandle,
            ctx.input.pipelineId
          );
    return { output: pipeline, message: `Retrieved pipeline **${pipeline.pipelineId}**.` };
  })
  .build();

export let listWorkspaceSchemas = SlateTool.create(spec, {
  name: 'List Workspace Schemas',
  key: 'list_workspace_schemas',
  description:
    'Discover queryable schemas and their connection or aggregator references. Call list_workspaces to discover workspace handles.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      ...workspaceFields,
      limit: z.number().optional().describe('Maximum schemas per page, from 1 through 100'),
      nextToken: z.string().optional().describe('Cursor returned by a previous page')
    })
  )
  .output(
    z.object({
      schemas: z
        .array(z.record(z.string(), z.unknown()))
        .describe(
          'Provider schema records with original field names, including stable IDs and schema names'
        ),
      nextToken: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromContext(ctx);
    let ownerHandle = await client.resolveOwner(ctx.input.ownerType, ctx.input.ownerHandle);
    let result = await client.listWorkspaceSchemas(
      ctx.input.ownerType,
      ownerHandle,
      ctx.input.workspaceHandle,
      ctx.input
    );
    return {
      output: { schemas: result.items, nextToken: result.nextToken },
      message: `Returned **${result.items.length}** schema(s) on this page.`
    };
  })
  .build();

export let listWorkspaceTables = SlateTool.create(spec, {
  name: 'List Workspace Tables',
  key: 'list_workspace_tables',
  description:
    'Discover a workspace schema’s tables and column metadata before writing SQL. Call list_workspaces and list_workspace_schemas to discover workspace handles and schema names.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      ...workspaceFields,
      schemaName: z.string().describe('Schema name returned by list_workspace_schemas')
    })
  )
  .output(
    z.object({
      tables: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Provider table records with original table names and columns'),
      nextToken: z
        .string()
        .optional()
        .describe(
          'Provider cursor, if returned; the documented table-list endpoint does not expose cursor inputs'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromContext(ctx);
    let ownerHandle = await client.resolveOwner(ctx.input.ownerType, ctx.input.ownerHandle);
    let result = await client.listWorkspaceTables(
      ctx.input.ownerType,
      ownerHandle,
      ctx.input.workspaceHandle,
      ctx.input.schemaName
    );
    return {
      output: { tables: result.items, nextToken: result.nextToken },
      message: `Returned **${result.items.length}** table(s).`
    };
  })
  .build();
