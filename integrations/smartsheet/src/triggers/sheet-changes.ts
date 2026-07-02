import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { SmartsheetClient } from '../lib/client';
import { spec } from '../spec';

let eventInputSchema = z.object({
  eventType: z.string().describe('Event type (e.g., row.created, cell.updated, column.added)'),
  eventId: z.string().describe('Unique event identifier for deduplication'),
  sheetId: z.string().describe('ID of the sheet that changed'),
  objectType: z
    .string()
    .describe('Type of changed object (row, column, cell, attachment, discussion, comment)'),
  rowId: z.string().optional().describe('ID of the affected row'),
  columnId: z.string().optional().describe('ID of the affected column'),
  userId: z.string().optional().describe('ID of the user who made the change'),
  timestamp: z.string().optional().describe('When the event occurred')
});

let eventOutputSchema = z.object({
  sheetId: z.string().describe('ID of the sheet that changed'),
  objectType: z.string().describe('Type of changed object'),
  rowId: z.string().optional().describe('ID of the affected row'),
  columnId: z.string().optional().describe('ID of the affected column'),
  userId: z.string().optional().describe('ID of the user who made the change'),
  timestamp: z.string().optional().describe('When the event occurred')
});

export let sheetChanges = SlateTrigger.create(spec, {
  name: 'Sheet Changes',
  key: 'sheet_changes',
  description:
    'Triggers when changes occur on a Smartsheet sheet, including row, column, cell, attachment, discussion, and comment changes. Uses webhooks for real-time notifications. Note: The webhook callback provides a "skinny payload" indicating what changed — use the Get Sheet tool to retrieve full data.'
})
  .input(eventInputSchema)
  .output(eventOutputSchema)
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new SmartsheetClient({ token: ctx.auth.token });

      // Create the webhook
      let result = await client.createWebhook({
        name: `Slates Sheet Webhook`,
        callbackUrl: ctx.input.webhookBaseUrl,
        scope: 'sheet',
        scopeObjectId: 0, // Placeholder — will be set via state
        events: ['*.*'],
        version: 1
      });

      let webhook = result.result || result;
      let webhookId = String(webhook.id);

      // Enable the webhook — Smartsheet sends a verification challenge first
      // The handleRequest will handle the challenge
      try {
        await client.updateWebhook(webhookId, { enabled: true });
      } catch (_e) {
        // Webhook might need verification first; it will be enabled after the challenge
        // is handled by handleRequest
      }

      return {
        registrationDetails: {
          webhookId,
          sharedSecret: webhook.sharedSecret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new SmartsheetClient({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookId: string };

      if (details?.webhookId) {
        await client.deleteWebhook(details.webhookId);
      }
    },

    handleRequest: async ctx => {
      let _contentType = ctx.request.headers.get('content-type') || '';

      // Handle Smartsheet verification challenge
      // When enabling a webhook, Smartsheet sends a challenge that must be echoed back
      let body = (await ctx.request.json()) as any;

      if (body.challenge) {
        // This is a verification request — respond with the challenge
        // The webhook system will handle the response
        return {
          inputs: [],
          response: new Response(JSON.stringify({ smartsheetHookResponse: body.challenge }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        };
      }

      // Normal webhook callback — skinny payload
      if (!body.events || !Array.isArray(body.events)) {
        return { inputs: [] };
      }

      let sheetId = body.scopeObjectId ? String(body.scopeObjectId) : '';
      let timestamp = body.timestamp || new Date().toISOString();
      let nonce = body.nonce || '';

      let inputs = body.events.map((event: any, index: number) => ({
        eventType: `${event.objectType || 'unknown'}.${event.eventType || 'unknown'}`,
        eventId: `${nonce}-${index}-${event.objectType}-${event.eventType}-${event.id || ''}`,
        sheetId,
        objectType: event.objectType || 'unknown',
        rowId: event.rowId ? String(event.rowId) : undefined,
        columnId: event.columnId ? String(event.columnId) : undefined,
        userId: event.userId ? String(event.userId) : undefined,
        timestamp
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType.toLowerCase(),
        id: ctx.input.eventId,
        output: {
          sheetId: ctx.input.sheetId,
          objectType: ctx.input.objectType,
          rowId: ctx.input.rowId,
          columnId: ctx.input.columnId,
          userId: ctx.input.userId,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
