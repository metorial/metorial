import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let databaseWebhookTrigger = SlateTrigger.create(spec, {
  name: 'Database Webhook',
  key: 'database_webhook',
  description:
    'Receives webhook notifications when INSERT, UPDATE, or DELETE events occur on Supabase database tables. Configure the webhook URL in your Supabase project dashboard under Database > Webhooks.'
})
  .input(
    z.object({
      eventType: z.enum(['INSERT', 'UPDATE', 'DELETE']).describe('Database event type'),
      table: z.string().describe('Table name'),
      schema: z.string().describe('Schema name'),
      newRecord: z
        .record(z.string(), z.any())
        .nullable()
        .describe('New row data (null for DELETE)'),
      oldRecord: z
        .record(z.string(), z.any())
        .nullable()
        .describe('Previous row data (null for INSERT)'),
      webhookId: z.string().describe('Unique identifier for this webhook delivery')
    })
  )
  .output(
    z.object({
      eventType: z.string().describe('Event type (INSERT, UPDATE, or DELETE)'),
      table: z.string().describe('Table name'),
      schema: z.string().describe('Schema name'),
      newRecord: z
        .record(z.string(), z.any())
        .nullable()
        .describe('New row data (null for DELETE)'),
      oldRecord: z
        .record(z.string(), z.any())
        .nullable()
        .describe(
          'Previous row data (null for INSERT, requires REPLICA IDENTITY FULL for UPDATE/DELETE)'
        )
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!data?.type) {
        return { inputs: [] };
      }

      let eventType = (data.type ?? '').toUpperCase();
      if (!['INSERT', 'UPDATE', 'DELETE'].includes(eventType)) {
        return { inputs: [] };
      }

      let table = data.table ?? '';
      let schema = data.schema ?? 'public';
      let newRecord = data.record ?? null;
      let oldRecord = data.old_record ?? null;

      let recordId = newRecord?.id ?? oldRecord?.id ?? '';
      let webhookId = `${schema}.${table}-${eventType}-${recordId}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType: eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            table,
            schema,
            newRecord,
            oldRecord,
            webhookId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let typeMap: Record<string, string> = {
        INSERT: 'row.inserted',
        UPDATE: 'row.updated',
        DELETE: 'row.deleted'
      };

      return {
        type: typeMap[ctx.input.eventType] ?? `row.${ctx.input.eventType.toLowerCase()}`,
        id: ctx.input.webhookId,
        output: {
          eventType: ctx.input.eventType,
          table: ctx.input.table,
          schema: ctx.input.schema,
          newRecord: ctx.input.newRecord,
          oldRecord: ctx.input.oldRecord
        }
      };
    }
  })
  .build();
