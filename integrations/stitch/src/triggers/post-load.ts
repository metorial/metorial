import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { StitchConnectClient } from '../lib/client';
import { spec } from '../spec';

export let postLoadTrigger = SlateTrigger.create(spec, {
  name: 'Post-Load Hook',
  key: 'post_load_hook',
  description:
    'Triggers when data is loaded into the destination warehouse. Fires on a per-integration, per-table basis for each successful or rejected load operation.'
})
  .input(
    z.object({
      integrationName: z.string().describe('Name of the integration/source'),
      tableName: z.string().describe('Name of the loaded table'),
      rowsLoaded: z.number().nullable().describe('Number of rows successfully loaded'),
      rowsRejected: z.number().nullable().describe('Number of rows rejected'),
      loadStatus: z.string().describe('Load status (loaded, rejected)'),
      primaryKeys: z.array(z.string()).optional().describe('Primary key columns'),
      bookmarkMetadata: z.any().optional().describe('Bookmark/replication state metadata'),
      rawPayload: z.any().describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      integrationName: z.string().describe('Name of the integration/source'),
      tableName: z.string().describe('Name of the loaded table'),
      rowsLoaded: z.number().nullable().describe('Number of rows successfully loaded'),
      rowsRejected: z.number().nullable().describe('Number of rows rejected'),
      loadStatus: z.string().describe('Load status'),
      primaryKeys: z.array(z.string()).optional().describe('Primary key columns'),
      bookmarkMetadata: z.any().optional().describe('Bookmark/replication state metadata')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new StitchConnectClient({
        token: ctx.auth.token,
        region: ctx.config.region,
        clientId: ctx.config.clientId
      });

      let hook = await client.createHook(ctx.input.webhookBaseUrl);

      return {
        registrationDetails: {
          hookId: hook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new StitchConnectClient({
        token: ctx.auth.token,
        region: ctx.config.region,
        clientId: ctx.config.clientId
      });

      await client.deleteHook(ctx.input.registrationDetails.hookId);
    },

    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      // Stitch sends one webhook per table per load. The payload may vary but typically includes
      // integration/source name, table name, row counts, etc.
      let integrationName =
        data.integration_name || data.source_name || data.name || 'unknown';
      let tableName = data.table_name || data.stream_name || 'unknown';
      let rowsLoaded = data.rows_loaded ?? data.loaded_rows ?? null;
      let rowsRejected = data.rows_rejected ?? data.rejected_rows ?? null;
      let loadStatus =
        data.status || (rowsRejected && rowsRejected > 0 ? 'rejected' : 'loaded');
      let primaryKeys = data.primary_keys || data.key_names || undefined;
      let bookmarkMetadata = data.bookmark_metadata || data.bookmarks || undefined;

      return {
        inputs: [
          {
            integrationName,
            tableName,
            rowsLoaded: typeof rowsLoaded === 'number' ? rowsLoaded : null,
            rowsRejected: typeof rowsRejected === 'number' ? rowsRejected : null,
            loadStatus,
            primaryKeys,
            bookmarkMetadata,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { integrationName, tableName, loadStatus } = ctx.input;

      return {
        type: `load.${loadStatus}`,
        id: `${integrationName}-${tableName}-${Date.now()}`,
        output: {
          integrationName: ctx.input.integrationName,
          tableName: ctx.input.tableName,
          rowsLoaded: ctx.input.rowsLoaded,
          rowsRejected: ctx.input.rowsRejected,
          loadStatus: ctx.input.loadStatus,
          primaryKeys: ctx.input.primaryKeys,
          bookmarkMetadata: ctx.input.bookmarkMetadata
        }
      };
    }
  })
  .build();
