import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let newKpiEntries = SlateTrigger.create(spec, {
  name: 'New KPI Entries',
  key: 'new_kpi_entries',
  description:
    'Triggers when new KPI data entries are created or updated. Polls for recent entries and detects new or changed records.'
})
  .input(
    z.object({
      entryId: z.number().describe('Entry identifier'),
      userId: z.number().describe('User who recorded the entry'),
      kpiId: z.number().describe('KPI the entry is for'),
      entryDate: z.string().describe('Date of the entry'),
      actual: z.number().nullable().describe('Actual value'),
      target: z.number().nullable().describe('Target value'),
      notes: z.string().nullable().describe('Entry notes'),
      createdAt: z.string().nullable().describe('Creation timestamp (UTC)'),
      updatedAt: z.string().nullable().describe('Last update timestamp (UTC)')
    })
  )
  .output(
    z.object({
      entryId: z.number().describe('Entry identifier'),
      userId: z.number().describe('User who recorded the entry'),
      kpiId: z.number().describe('KPI the entry is for'),
      entryDate: z.string().describe('Date of the entry'),
      actual: z.number().nullable().describe('Actual value'),
      target: z.number().nullable().describe('Target value'),
      notes: z.string().nullable().describe('Entry notes'),
      createdAt: z.string().nullable().describe('Creation timestamp (UTC)'),
      updatedAt: z.string().nullable().describe('Last update timestamp (UTC)')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx.config, ctx.auth);

      let lastSeenId = (ctx.state as any)?.lastSeenId as number | undefined;
      let lastUpdatedAt = (ctx.state as any)?.lastUpdatedAt as string | undefined;

      // Query entries from a wide date range to catch recent entries
      let now = new Date();
      let thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      let dateFrom = thirtyDaysAgo.toISOString().split('T')[0];
      let dateTo = now.toISOString().split('T')[0];

      let entries = await client.listKpiEntries({
        dateFrom,
        dateTo,
        rows: 500,
        page: 1
      });

      let allEntries: any[] = Array.isArray(entries) ? entries : [];

      // Filter to only new or updated entries
      let newEntries = allEntries.filter((e: any) => {
        if (lastSeenId && e.id <= lastSeenId) {
          // Check if it's been updated since our last poll
          if (lastUpdatedAt && e.updated_at && e.updated_at > lastUpdatedAt) {
            return true;
          }
          return false;
        }
        return true;
      });

      // Track the latest ID and updated_at for next poll
      let newLastSeenId = lastSeenId ?? 0;
      let newLastUpdatedAt = lastUpdatedAt ?? '';

      for (let e of allEntries) {
        if (e.id > newLastSeenId) {
          newLastSeenId = e.id;
        }
        if (e.updated_at && e.updated_at > newLastUpdatedAt) {
          newLastUpdatedAt = e.updated_at;
        }
      }

      let inputs = newEntries.map((e: any) => ({
        entryId: e.id,
        userId: e.user_id,
        kpiId: e.kpi_id,
        entryDate: e.entry_date,
        actual: e.actual ?? null,
        target: e.target ?? null,
        notes: e.notes ?? null,
        createdAt: e.created_at ?? null,
        updatedAt: e.updated_at ?? null
      }));

      return {
        inputs,
        updatedState: {
          lastSeenId: newLastSeenId,
          lastUpdatedAt: newLastUpdatedAt
        }
      };
    },

    handleEvent: async ctx => {
      let isUpdate =
        ctx.input.updatedAt &&
        ctx.input.createdAt &&
        ctx.input.updatedAt !== ctx.input.createdAt;
      let eventType = isUpdate ? 'kpi_entry.updated' : 'kpi_entry.created';

      return {
        type: eventType,
        id: `${ctx.input.entryId}-${ctx.input.updatedAt || ctx.input.createdAt || ctx.input.entryId}`,
        output: {
          entryId: ctx.input.entryId,
          userId: ctx.input.userId,
          kpiId: ctx.input.kpiId,
          entryDate: ctx.input.entryDate,
          actual: ctx.input.actual,
          target: ctx.input.target,
          notes: ctx.input.notes,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
