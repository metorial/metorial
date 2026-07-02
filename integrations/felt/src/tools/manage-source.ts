import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSource = SlateTool.create(spec, {
  name: 'Manage Source',
  key: 'manage_source',
  description: `Create, update, sync, or delete a data source connection in Felt. Data sources connect to external storage like S3, Azure Blob, PostgreSQL, Snowflake, and more.

To **create** a new source, provide name and connection details.
To **update** a source, provide the source ID and updated connection/settings.
To **sync** a source, provide the source ID and set sync to true.
To **delete** a source, provide the source ID and set delete to true.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sourceId: z
        .string()
        .optional()
        .describe('Source ID (required for update, sync, delete)'),
      name: z.string().optional().describe('Name for the source'),
      connection: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Connection configuration object (varies by source type)'),
      permissions: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Permission settings for the source'),
      sync: z.boolean().optional().describe('Set to true to trigger a full data sync'),
      delete: z.boolean().optional().describe('Set to true to delete the source')
    })
  )
  .output(
    z.object({
      sourceId: z.string().describe('Source ID'),
      action: z.string().describe('Action performed (created, updated, synced, deleted)'),
      name: z.string().nullable().describe('Source name'),
      syncStatus: z.string().nullable().describe('Current sync status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.delete && ctx.input.sourceId) {
      await client.deleteSource(ctx.input.sourceId);
      return {
        output: {
          sourceId: ctx.input.sourceId,
          action: 'deleted',
          name: null,
          syncStatus: null
        },
        message: `Deleted source \`${ctx.input.sourceId}\`.`
      };
    }

    if (ctx.input.sync && ctx.input.sourceId) {
      await client.syncSource(ctx.input.sourceId);
      return {
        output: {
          sourceId: ctx.input.sourceId,
          action: 'synced',
          name: null,
          syncStatus: 'syncing'
        },
        message: `Triggered sync for source \`${ctx.input.sourceId}\`.`
      };
    }

    if (ctx.input.sourceId) {
      let updates: Record<string, unknown> = {};
      if (ctx.input.name !== undefined) updates.name = ctx.input.name;
      if (ctx.input.connection !== undefined) updates.connection = ctx.input.connection;
      if (ctx.input.permissions !== undefined) updates.permissions = ctx.input.permissions;

      let source = await client.updateSource(ctx.input.sourceId, updates);
      return {
        output: {
          sourceId: source.id,
          action: 'updated',
          name: source.name ?? null,
          syncStatus: source.sync_status ?? null
        },
        message: `Updated source **${source.name}**.`
      };
    }

    if (!ctx.input.name || !ctx.input.connection) {
      throw new Error('name and connection are required to create a source');
    }

    let source = await client.createSource({
      name: ctx.input.name,
      connection: ctx.input.connection,
      permissions: ctx.input.permissions
    });

    return {
      output: {
        sourceId: source.id,
        action: 'created',
        name: source.name ?? null,
        syncStatus: source.sync_status ?? null
      },
      message: `Created source **${source.name}**.`
    };
  })
  .build();
