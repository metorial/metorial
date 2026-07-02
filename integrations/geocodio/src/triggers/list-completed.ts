import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCompleted = SlateTrigger.create(spec, {
  name: 'List Processing Completed',
  key: 'list_completed',
  description:
    'Triggers when a geocoding list job finishes processing. Polls for newly completed lists.'
})
  .input(
    z.object({
      listId: z.number().describe('ID of the completed list'),
      filename: z.string().optional().describe('Filename of the list'),
      status: z.string().describe('Final status of the list'),
      rows: z.number().optional().describe('Total rows in the list'),
      geocodedRows: z.number().optional().describe('Number of rows geocoded'),
      fields: z.array(z.string()).optional().describe('Fields that were appended'),
      expiresAt: z.string().optional().describe('When the results will expire')
    })
  )
  .output(
    z.object({
      listId: z.number().describe('ID of the completed list'),
      filename: z.string().optional().describe('Filename of the list'),
      status: z.string().describe('Final status of the list'),
      rows: z.number().optional().describe('Total rows'),
      geocodedRows: z.number().optional().describe('Number of rows geocoded'),
      fields: z.array(z.string()).optional().describe('Enrichment fields appended'),
      expiresAt: z.string().optional().describe('When results expire')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let completedIds: Set<number> = new Set(ctx.state?.completedListIds || []);

      let response = await client.getLists();
      let allLists = response.data || response.lists || [];

      let newlyCompleted = allLists.filter(
        (list: any) =>
          (list.status === 'completed' || list.status === 'failed') &&
          !completedIds.has(list.id)
      );

      let inputs = newlyCompleted.map((list: any) => ({
        listId: list.id,
        filename: list.file?.filename,
        status: list.status,
        rows: list.file?.estimated_rows_count,
        geocodedRows: list.file?.geocoded_rows_count,
        fields: list.fields,
        expiresAt: list.expires_at
      }));

      let updatedCompletedIds = [...completedIds];
      for (let list of newlyCompleted) {
        updatedCompletedIds.push(list.id);
      }

      // Keep only last 500 IDs to prevent unbounded state growth
      if (updatedCompletedIds.length > 500) {
        updatedCompletedIds = updatedCompletedIds.slice(-500);
      }

      return {
        inputs,
        updatedState: {
          completedListIds: updatedCompletedIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `list.${ctx.input.status}`,
        id: `list-${ctx.input.listId}`,
        output: {
          listId: ctx.input.listId,
          filename: ctx.input.filename,
          status: ctx.input.status,
          rows: ctx.input.rows,
          geocodedRows: ctx.input.geocodedRows,
          fields: ctx.input.fields,
          expiresAt: ctx.input.expiresAt
        }
      };
    }
  })
  .build();
