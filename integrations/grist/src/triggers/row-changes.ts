import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { GristClient } from '../lib/client';
import { spec } from '../spec';

export let rowChanges = SlateTrigger.create(spec, {
  name: 'Row Changes',
  key: 'row_changes',
  description:
    'Triggers when rows are added or updated in a Grist table. Receives the changed row data via webhook.'
})
  .input(
    z.object({
      eventType: z.enum(['add', 'update']).describe('Type of row change'),
      eventId: z.string().describe('Unique event identifier'),
      documentId: z.string().describe('Document ID'),
      tableId: z.string().describe('Table ID'),
      rows: z
        .array(
          z.object({
            recordId: z.number().describe('Row/record ID'),
            fields: z.record(z.string(), z.any()).describe('Row field values')
          })
        )
        .describe('Changed rows')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Document ID'),
      tableId: z.string().describe('Table ID'),
      rows: z
        .array(
          z.object({
            recordId: z.number().describe('Row/record ID'),
            fields: z.record(z.string(), z.any()).describe('Row field values')
          })
        )
        .describe('Changed rows')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let _client = new GristClient({
        token: ctx.auth.token,
        serverUrl: ctx.auth.serverUrl
      });

      // We need a document ID and table ID to register webhooks.
      // These will be stored in state during setup.
      // For now, we return empty registration details - the user
      // must configure documentId and tableId via the webhook URL subpath.
      // Format: webhookBaseUrl/{documentId}/{tableId}

      // The webhook URL from the platform is used directly.
      // The user configures which doc/table via Grist's webhook management.
      // We register for both 'add' and 'update' events.

      // Note: Grist webhooks are registered per-document.
      // We'll parse documentId and tableId from state or use a convention.

      return {
        registrationDetails: {}
      };
    },

    autoUnregisterWebhook: async ctx => {
      // If we stored a webhookId during registration, we can clean it up
      let details = ctx.input.registrationDetails;
      if (details?.webhookId && details?.documentId) {
        let client = new GristClient({
          token: ctx.auth.token,
          serverUrl: ctx.auth.serverUrl
        });
        try {
          await client.deleteWebhook(details.documentId, details.webhookId);
        } catch (e: any) {
          if (e?.response?.status !== 404) {
            throw e;
          }
        }
      }
    },

    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      // Grist webhook payload is a JSON array of row objects
      // Each row has column values as properties, plus an "id" field
      if (!data || !Array.isArray(data)) {
        return { inputs: [] };
      }

      if (data.length === 0) {
        return { inputs: [] };
      }

      // Extract document ID and table ID from the URL path if present
      let url = new URL(ctx.request.url);
      let pathParts = url.pathname.split('/').filter(Boolean);

      // Try to get documentId and tableId from the last path segments
      let documentId = '';
      let tableId = '';
      if (pathParts.length >= 2) {
        tableId = pathParts[pathParts.length - 1]!;
        documentId = pathParts[pathParts.length - 2]!;
      }

      let rows = data.map((row: any) => {
        let { id, ...fields } = row;
        return {
          recordId: id as number,
          fields
        };
      });

      // Generate a unique event ID based on the row IDs and current time
      let rowIds = rows.map((r: any) => r.recordId).join(',');
      let eventId = `${documentId}_${tableId}_${rowIds}_${Date.now()}`;

      // We can't distinguish add vs update from the payload alone,
      // so we default to "add" - the specific event type depends on webhook config
      let eventType: 'add' | 'update' = 'add';

      return {
        inputs: [
          {
            eventType,
            eventId,
            documentId,
            tableId,
            rows
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `row.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          documentId: ctx.input.documentId,
          tableId: ctx.input.tableId,
          rows: ctx.input.rows
        }
      };
    }
  })
  .build();
