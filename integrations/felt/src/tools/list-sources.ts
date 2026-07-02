import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSources = SlateTool.create(spec, {
  name: 'List Sources',
  key: 'list_sources',
  description: `List all data source connections in the workspace. Returns each source's ID, name, connection type, sync status, and timestamps.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().optional().describe('Workspace ID to filter sources (optional)')
    })
  )
  .output(
    z.object({
      sources: z
        .array(
          z.object({
            sourceId: z.string().describe('Source ID'),
            name: z.string().nullable().describe('Source name'),
            connectionType: z
              .string()
              .nullable()
              .describe('Connection type (e.g. s3_bucket, postgresql)'),
            syncStatus: z.string().nullable().describe('Current sync status'),
            automaticSync: z.string().nullable().describe('Automatic sync setting'),
            lastSyncedAt: z.string().nullable().describe('Last sync timestamp')
          })
        )
        .describe('List of data sources')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let sources = await client.listSources(ctx.input.workspaceId);

    let mapped = (Array.isArray(sources) ? sources : []).map((s: any) => ({
      sourceId: s.id,
      name: s.name ?? null,
      connectionType: s.connection_type ?? null,
      syncStatus: s.sync_status ?? null,
      automaticSync: s.automatic_sync ?? null,
      lastSyncedAt: s.last_synced_at ?? null
    }));

    return {
      output: { sources: mapped },
      message: `Found **${mapped.length}** data source(s).`
    };
  })
  .build();
