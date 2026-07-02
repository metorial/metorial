import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let snapshotSchema = z.object({
  snapshotId: z.string().describe('Unique snapshot identifier'),
  workspaceId: z.string().optional().describe('Workspace identifier'),
  identityId: z.string().optional().describe('Owner identity ID'),
  state: z.string().optional().describe('Snapshot state'),
  visibility: z
    .string()
    .optional()
    .describe('Snapshot visibility (workspace or anyone_with_link)'),
  dashboardName: z.string().optional().describe('Dashboard name'),
  dashboardTitle: z.string().optional().describe('Dashboard title'),
  expiresAt: z.string().optional().describe('Expiration timestamp'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listSnapshots = SlateTool.create(spec, {
  name: 'List Snapshots',
  key: 'list_snapshots',
  description: `List dashboard snapshots for a workspace. Snapshots capture the state of Powerpipe dashboards and benchmarks, and can be shared internally or publicly.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceHandle: z.string().describe('Handle of the workspace'),
      ownerHandle: z
        .string()
        .optional()
        .describe('Owner handle (user or org). Defaults to the authenticated user.'),
      ownerType: z
        .enum(['user', 'org'])
        .default('user')
        .describe('Whether the owner is a user or organization'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      nextToken: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      snapshots: z.array(snapshotSchema).describe('List of snapshots'),
      nextToken: z.string().optional().describe('Pagination cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let ownerHandle = ctx.input.ownerHandle;
    if (!ownerHandle) {
      let actor = await client.getActor();
      ownerHandle = actor.handle;
    }

    let result: any;
    if (ctx.input.ownerType === 'org') {
      result = await client.listOrgSnapshots(ownerHandle, ctx.input.workspaceHandle, {
        limit: ctx.input.limit,
        nextToken: ctx.input.nextToken
      });
    } else {
      result = await client.listSnapshots(ownerHandle, ctx.input.workspaceHandle, {
        limit: ctx.input.limit,
        nextToken: ctx.input.nextToken
      });
    }

    return {
      output: {
        snapshots: result.items,
        nextToken: result.nextToken
      },
      message: `Found **${result.items.length}** snapshot(s) in workspace **${ctx.input.workspaceHandle}**${result.nextToken ? ' (more available)' : ''}.`
    };
  })
  .build();

export let getSnapshot = SlateTool.create(spec, {
  name: 'Get Snapshot',
  key: 'get_snapshot',
  description: `Get detailed information about a specific dashboard snapshot, including its visibility, dashboard name, and expiration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceHandle: z.string().describe('Handle of the workspace'),
      snapshotId: z.string().describe('Snapshot ID to retrieve'),
      ownerHandle: z
        .string()
        .optional()
        .describe('Owner handle (user). Defaults to the authenticated user.')
    })
  )
  .output(snapshotSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let ownerHandle = ctx.input.ownerHandle;
    if (!ownerHandle) {
      let actor = await client.getActor();
      ownerHandle = actor.handle;
    }

    let snapshot = await client.getSnapshot(
      ownerHandle,
      ctx.input.workspaceHandle,
      ctx.input.snapshotId
    );

    return {
      output: snapshot,
      message: `Snapshot **${snapshot.snapshotId}** (${snapshot.dashboardTitle || snapshot.dashboardName || 'untitled'}) - visibility: ${snapshot.visibility || 'unknown'}.`
    };
  })
  .build();
