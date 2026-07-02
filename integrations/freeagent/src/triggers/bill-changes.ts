import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { FreeAgentClient } from '../lib/client';
import { spec } from '../spec';

export let billChanges = SlateTrigger.create(spec, {
  name: 'Bill Changes',
  key: 'bill_changes',
  description: 'Polls for new or updated supplier bills in FreeAgent.'
})
  .input(
    z.object({
      billId: z.string().describe('FreeAgent bill ID'),
      reference: z.string().optional().describe('Bill reference'),
      status: z.string().optional().describe('Bill status'),
      contact: z.string().optional().describe('Contact URL'),
      totalValue: z.string().optional().describe('Total value'),
      datedOn: z.string().optional().describe('Bill date'),
      dueOn: z.string().optional().describe('Due date'),
      currency: z.string().optional().describe('Currency code'),
      updatedAt: z.string().optional().describe('Last updated timestamp'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      raw: z.record(z.string(), z.any()).optional().describe('Full bill payload')
    })
  )
  .output(
    z.object({
      billId: z.string().describe('FreeAgent bill ID'),
      reference: z.string().optional().describe('Bill reference'),
      status: z.string().optional().describe('Bill status'),
      contact: z.string().optional().describe('Contact URL'),
      totalValue: z.string().optional().describe('Total value'),
      datedOn: z.string().optional().describe('Bill date'),
      dueOn: z.string().optional().describe('Due date'),
      currency: z.string().optional().describe('Currency code'),
      updatedAt: z.string().optional().describe('Last updated timestamp'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new FreeAgentClient({
        token: ctx.auth.token,
        environment: ctx.config.environment
      });

      let lastPolled = ctx.state?.lastPolled as string | undefined;
      let bills = await client.listBills({
        updatedSince: lastPolled
      });

      let now = new Date().toISOString();

      let inputs = bills.map((b: any) => {
        let url = b.url || '';
        let billId = url.split('/').pop() || '';
        return {
          billId,
          reference: b.reference,
          status: b.status,
          contact: b.contact,
          totalValue: b.total_value != null ? String(b.total_value) : undefined,
          datedOn: b.dated_on,
          dueOn: b.due_on,
          currency: b.currency,
          updatedAt: b.updated_at,
          createdAt: b.created_at,
          raw: b
        };
      });

      return {
        inputs,
        updatedState: {
          lastPolled: now
        }
      };
    },

    handleEvent: async ctx => {
      let isNew = ctx.input.createdAt === ctx.input.updatedAt;
      let eventType = isNew ? 'created' : 'updated';

      return {
        type: `bill.${eventType}`,
        id: `${ctx.input.billId}-${ctx.input.updatedAt || Date.now()}`,
        output: {
          billId: ctx.input.billId,
          reference: ctx.input.reference,
          status: ctx.input.status,
          contact: ctx.input.contact,
          totalValue: ctx.input.totalValue,
          datedOn: ctx.input.datedOn,
          dueOn: ctx.input.dueOn,
          currency: ctx.input.currency,
          updatedAt: ctx.input.updatedAt,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
