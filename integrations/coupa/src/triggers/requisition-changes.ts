import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { CoupaClient } from '../lib/client';
import { spec } from '../spec';

export let requisitionChanges = SlateTrigger.create(spec, {
  name: 'Requisition Changes',
  key: 'requisition_changes',
  description:
    'Triggers when purchase requisitions are created, submitted, approved, or otherwise updated in Coupa.'
})
  .input(
    z.object({
      requisitionId: z.number().describe('Requisition ID'),
      requisitionNumber: z.string().nullable().optional().describe('Requisition number'),
      status: z.string().nullable().optional().describe('Current requisition status'),
      updatedAt: z.string().describe('Last update timestamp'),
      rawData: z.any().describe('Full requisition data')
    })
  )
  .output(
    z.object({
      requisitionId: z.number().describe('Coupa requisition ID'),
      requisitionNumber: z.string().nullable().optional().describe('Requisition number'),
      status: z.string().nullable().optional().describe('Current status'),
      requestedBy: z.any().nullable().optional().describe('Requesting user'),
      totalAmount: z.any().nullable().optional().describe('Requisition total'),
      currency: z.any().nullable().optional().describe('Currency'),
      requisitionLines: z
        .array(z.any())
        .nullable()
        .optional()
        .describe('Requisition line items'),
      justification: z.string().nullable().optional().describe('Justification'),
      createdAt: z.string().nullable().optional().describe('Creation timestamp'),
      updatedAt: z.string().nullable().optional().describe('Last update timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new CoupaClient({
        token: ctx.auth.token,
        instanceUrl: ctx.config.instanceUrl
      });

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let filters: Record<string, string> = {};

      if (lastPollTime) {
        filters['updated-at[gt]'] = lastPollTime;
      }

      let results = await client.listRequisitions({
        filters,
        orderBy: 'updated_at',
        dir: 'asc',
        limit: 50
      });

      let reqs = Array.isArray(results) ? results : [];

      let newLastPollTime = lastPollTime;
      if (reqs.length > 0) {
        let lastReq = reqs[reqs.length - 1];
        newLastPollTime = lastReq['updated-at'] ?? lastReq.updated_at ?? lastPollTime;
      }

      return {
        inputs: reqs.map((r: any) => ({
          requisitionId: r.id,
          requisitionNumber: r['requisition-number'] ?? r.requisition_number ?? null,
          status: r.status ?? null,
          updatedAt: r['updated-at'] ?? r.updated_at ?? '',
          rawData: r
        })),
        updatedState: {
          lastPollTime: newLastPollTime ?? new Date().toISOString()
        }
      };
    },

    handleEvent: async ctx => {
      let r = ctx.input.rawData;

      return {
        type: 'requisition.updated',
        id: `req-${ctx.input.requisitionId}-${ctx.input.updatedAt}`,
        output: {
          requisitionId: ctx.input.requisitionId,
          requisitionNumber: ctx.input.requisitionNumber,
          status: ctx.input.status,
          requestedBy: r['requested-by'] ?? r.requested_by ?? null,
          totalAmount: r.total ?? r.total ?? null,
          currency: r.currency ?? null,
          requisitionLines: r['requisition-lines'] ?? r.requisition_lines ?? null,
          justification: r.justification ?? null,
          createdAt: r['created-at'] ?? r.created_at ?? null,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
