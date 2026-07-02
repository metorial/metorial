import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { RenderClient } from '../lib/client';
import { spec } from '../spec';

let blueprintSchema = z.object({
  blueprintId: z.string().describe('Blueprint ID'),
  name: z.string().optional().describe('Blueprint name'),
  status: z.string().optional().describe('Blueprint sync status'),
  autoSync: z.boolean().optional().describe('Whether automatic sync is enabled'),
  repo: z.string().optional().describe('Repository URL'),
  branch: z.string().optional().describe('Repository branch'),
  path: z.string().optional().describe('Path to render.yaml'),
  lastSync: z.string().optional().describe('Last sync timestamp')
});

let syncSchema = z.object({
  syncId: z.string().describe('Blueprint sync ID'),
  state: z.string().optional().describe('Sync state'),
  commitId: z.string().optional().describe('Commit ID'),
  startedAt: z.string().optional().describe('Sync start timestamp'),
  completedAt: z.string().optional().describe('Sync completion timestamp')
});

let mapBlueprint = (value: any) => {
  let blueprint = value.blueprint || value;
  return {
    blueprintId: blueprint.id,
    name: blueprint.name,
    status: blueprint.status,
    autoSync: blueprint.autoSync,
    repo: blueprint.repo,
    branch: blueprint.branch,
    path: blueprint.path,
    lastSync: blueprint.lastSync
  };
};

export let manageBlueprints = SlateTool.create(spec, {
  name: 'Manage Blueprints',
  key: 'manage_blueprints',
  description: `List Render Blueprints, retrieve a Blueprint, or list Blueprint sync history. Blueprints define Render infrastructure from render.yaml files.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'list_syncs']).describe('Blueprint action'),
      ownerId: z.string().optional().describe('Workspace ID filter for list'),
      blueprintId: z.string().optional().describe('Blueprint ID for get/list_syncs'),
      limit: z.number().optional().describe('Maximum results'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      blueprints: z.array(blueprintSchema).optional().describe('Blueprints'),
      blueprint: blueprintSchema.optional().describe('Single Blueprint'),
      syncs: z.array(syncSchema).optional().describe('Blueprint syncs'),
      cursor: z.string().optional().describe('Cursor for next page'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RenderClient(ctx.auth.token);
    let { action } = ctx.input;

    if (action === 'list') {
      let params: Record<string, any> = {};
      if (ctx.input.ownerId) params.ownerId = [ctx.input.ownerId];
      if (ctx.input.limit) params.limit = ctx.input.limit;
      if (ctx.input.cursor) params.cursor = ctx.input.cursor;
      let data = await client.listBlueprints(params);
      let lastCursor: string | undefined;
      let blueprints = (Array.isArray(data) ? data : []).map((item: any) => {
        lastCursor = item.cursor;
        return mapBlueprint(item);
      });
      return {
        output: { blueprints, cursor: lastCursor, success: true },
        message: `Found **${blueprints.length}** Blueprint(s).`
      };
    }

    if (!ctx.input.blueprintId) {
      throw createApiServiceError('blueprintId is required');
    }

    if (action === 'get') {
      let blueprint = mapBlueprint(await client.getBlueprint(ctx.input.blueprintId));
      return {
        output: { blueprint, success: true },
        message: `Blueprint **${blueprint.name || blueprint.blueprintId}** status: **${blueprint.status || 'unknown'}**.`
      };
    }

    let params: Record<string, any> = {};
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.cursor) params.cursor = ctx.input.cursor;
    let data = await client.listBlueprintSyncs(ctx.input.blueprintId, params);
    let lastCursor: string | undefined;
    let syncs = (Array.isArray(data) ? data : []).map((item: any) => {
      lastCursor = item.cursor;
      let sync = item.sync || item;
      return {
        syncId: sync.id,
        state: sync.state,
        commitId: sync.commit?.id,
        startedAt: sync.startedAt,
        completedAt: sync.completedAt
      };
    });
    return {
      output: { syncs, cursor: lastCursor, success: true },
      message: `Found **${syncs.length}** sync(s) for Blueprint \`${ctx.input.blueprintId}\`.`
    };
  })
  .build();
