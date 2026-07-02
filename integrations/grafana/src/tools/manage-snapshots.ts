import { SlateTool } from 'slates';
import { z } from 'zod';
import { GrafanaClient } from '../lib/client';
import { spec } from '../spec';

export let listSnapshots = SlateTool.create(spec, {
  name: 'List Snapshots',
  key: 'list_snapshots',
  description: `List dashboard snapshots. Snapshots are point-in-time captures of dashboard data that can be shared externally without requiring Grafana access.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query to filter snapshots by name'),
      limit: z.number().optional().describe('Maximum number of snapshots to return')
    })
  )
  .output(
    z.object({
      snapshots: z.array(
        z.object({
          snapshotId: z.number().describe('Numeric ID of the snapshot'),
          name: z.string().optional().describe('Snapshot name'),
          key: z.string().describe('Snapshot key used for URL access'),
          externalUrl: z.string().optional().describe('External URL if stored externally'),
          expires: z.string().optional().describe('Expiration timestamp'),
          created: z.string().optional().describe('Creation timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let results = await client.listSnapshots(ctx.input.query, ctx.input.limit);

    let snapshots = results.map((s: any) => ({
      snapshotId: s.id,
      name: s.name,
      key: s.key,
      externalUrl: s.externalUrl,
      expires: s.expires,
      created: s.created
    }));

    return {
      output: { snapshots },
      message: `Found **${snapshots.length}** snapshot(s).`
    };
  })
  .build();

export let createSnapshot = SlateTool.create(spec, {
  name: 'Create Snapshot',
  key: 'create_snapshot',
  description: `Create a dashboard snapshot for sharing. Captures the current state of a dashboard including all panel data, enabling external sharing without Grafana access.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      dashboard: z.any().describe('Full dashboard model JSON to snapshot'),
      name: z.string().optional().describe('Name for the snapshot'),
      expires: z
        .number()
        .optional()
        .describe('Seconds until the snapshot expires. 0 means no expiration.'),
      external: z.boolean().optional().describe('Whether to store the snapshot externally')
    })
  )
  .output(
    z.object({
      key: z.string().describe('Snapshot key for URL access'),
      deleteKey: z
        .string()
        .optional()
        .describe('Key to delete the snapshot without authentication'),
      snapshotUrl: z.string().describe('URL to view the snapshot'),
      snapshotId: z.number().optional().describe('Numeric ID of the snapshot')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.createSnapshot({
      dashboard: ctx.input.dashboard,
      name: ctx.input.name,
      expires: ctx.input.expires,
      external: ctx.input.external
    });

    return {
      output: {
        key: result.key,
        deleteKey: result.deleteKey,
        snapshotUrl: result.url,
        snapshotId: result.id
      },
      message: `Snapshot created. View at: ${result.url}`
    };
  })
  .build();

export let deleteSnapshot = SlateTool.create(spec, {
  name: 'Delete Snapshot',
  key: 'delete_snapshot',
  description: `Delete a dashboard snapshot by its key.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      key: z.string().describe('Snapshot key to delete')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    await client.deleteSnapshot(ctx.input.key);

    return {
      output: {
        message: `Snapshot ${ctx.input.key} deleted.`
      },
      message: `Snapshot **${ctx.input.key}** has been deleted.`
    };
  })
  .build();
