import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let rowCompleted = SlateTrigger.create(spec, {
  name: 'Row Completed',
  key: 'row_completed',
  description:
    'Triggers after each individual row has finished processing. Useful for streaming results as they become available rather than waiting for the full job to complete.'
})
  .input(
    z.object({
      row: z.record(z.string(), z.unknown()).describe('The result data for the completed row')
    })
  )
  .output(
    z.object({
      row: z.record(z.string(), z.unknown()).describe('Result data for the completed row')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let webhook = await client.createWebhook({
        webhookName: 'Slates - Row Completed',
        webhookType: 'row',
        endpointUrl: ctx.input.webhookBaseUrl,
        webhookReference: `slates-row-${Date.now()}`
      });

      return {
        registrationDetails: {
          webhookId: webhook.webhookId,
          webhookReference: webhook.webhookReference
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let ref = ctx.input.registrationDetails?.webhookReference;
      if (ref) {
        await client.deleteWebhook(ref);
      }
    },

    handleRequest: async ctx => {
      let data = await ctx.request.json();

      // Row webhook sends an array with a single result entry
      let rows = Array.isArray(data) ? data : [data];

      return {
        inputs: rows.map((row: Record<string, unknown>) => ({ row }))
      };
    },

    handleEvent: async ctx => {
      let row = ctx.input.row;
      let eventId = (row.rowId as string) || (row.jobId as string) || `row-${Date.now()}`;

      return {
        type: 'row.completed',
        id: eventId,
        output: {
          row
        }
      };
    }
  })
  .build();
