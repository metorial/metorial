import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let recordChanges = SlateTrigger.create(spec, {
  name: 'Record Changes',
  key: 'record_changes',
  description:
    'Fires when records are created, updated, or deleted in a Ragic sheet. Supports both minimal payloads (record IDs only) and full content payloads. Configure webhooks per sheet in Ragic under Tools > Sync > Webhook.'
})
  .input(
    z.object({
      eventType: z
        .enum(['CREATE', 'UPDATE', 'DELETE', 'unknown'])
        .describe('Type of change event'),
      accountName: z.string().optional().describe('Ragic account name'),
      sheetPath: z.string().optional().describe('Sheet path in the URL'),
      sheetIndex: z.number().optional().describe('Sheet index number'),
      recordId: z.string().describe('ID of the affected record'),
      recordData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Full record data if full content was enabled')
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('ID of the affected record'),
      eventType: z.string().describe('Type of change: CREATE, UPDATE, or DELETE'),
      accountName: z.string().optional().describe('Ragic account name'),
      sheetPath: z.string().optional().describe('Sheet path'),
      sheetIndex: z.number().optional().describe('Sheet index'),
      recordData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Full record data if available')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      // Full content payload: { data: [...], apname, path, sheetIndex, eventType }
      if (body && typeof body === 'object' && !Array.isArray(body) && body.data) {
        let eventType = body.eventType || 'unknown';
        let accountName = body.apname || undefined;
        let sheetPath = body.path || undefined;
        let sheetIndex = body.sheetIndex !== undefined ? Number(body.sheetIndex) : undefined;
        let dataEntries = Array.isArray(body.data) ? body.data : [body.data];

        let inputs = dataEntries.map((entry: any) => {
          let recordId =
            entry?._ragicId !== undefined
              ? String(entry._ragicId)
              : String(Object.keys(entry || {})[0] || 'unknown');

          return {
            eventType: eventType as 'CREATE' | 'UPDATE' | 'DELETE' | 'unknown',
            accountName,
            sheetPath,
            sheetIndex,
            recordId,
            recordData: entry
          };
        });

        return { inputs };
      }

      // Minimal payload: array of record IDs, e.g. [1, 2, 4]
      if (Array.isArray(body)) {
        let inputs = body.map((id: any) => ({
          eventType: 'unknown' as const,
          accountName: undefined,
          sheetPath: undefined,
          sheetIndex: undefined,
          recordId: String(id),
          recordData: undefined
        }));

        return { inputs };
      }

      return { inputs: [] };
    },

    handleEvent: async ctx => {
      let eventTypeLower = ctx.input.eventType.toLowerCase();

      return {
        type: `record.${eventTypeLower}`,
        id: `${ctx.input.eventType}-${ctx.input.recordId}-${Date.now()}`,
        output: {
          recordId: ctx.input.recordId,
          eventType: ctx.input.eventType,
          accountName: ctx.input.accountName,
          sheetPath: ctx.input.sheetPath,
          sheetIndex: ctx.input.sheetIndex,
          recordData: ctx.input.recordData
        }
      };
    }
  })
  .build();
