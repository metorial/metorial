import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let opportunityChanges = SlateTrigger.create(spec, {
  name: 'Opportunity Changes',
  key: 'opportunity_changes',
  description: 'Triggers when sales opportunities are created or updated in ForceManager.'
})
  .input(
    z.object({
      opportunityId: z.number().describe('Opportunity ID'),
      record: z.any().describe('Full opportunity record'),
      detectedAt: z.string().describe('Timestamp when the change was detected')
    })
  )
  .output(
    z.object({
      opportunityId: z.number().describe('Opportunity ID'),
      reference: z.string().nullable().describe('Opportunity reference'),
      total: z.number().nullable().describe('Opportunity amount'),
      salesProbability: z.number().nullable().describe('Win probability percentage'),
      statusId: z.any().nullable().describe('Opportunity status'),
      accountId1: z.any().nullable().describe('Primary account'),
      salesRepId: z.any().nullable().describe('Assigned sales rep'),
      salesForecastDate: z.string().nullable().describe('Expected closing date'),
      wonDate: z.string().nullable().describe('Won date'),
      lostDate: z.string().nullable().describe('Lost date'),
      dateCreated: z.string().nullable().describe('Record creation date'),
      dateUpdated: z.string().nullable().describe('Record last update date'),
      record: z.any().describe('Full opportunity record')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client(ctx.auth);
      let lastPollTime = ctx.state?.lastPollTime || new Date().toISOString().replace('Z', '');

      let allRecords: any[] = [];
      let page: number | undefined = 0;
      let maxPages = 10;

      while (page !== undefined && page !== null && maxPages > 0) {
        let result = await client.listModifiedSince('opportunities', lastPollTime, page);
        allRecords.push(...result.records);
        page = result.nextPage !== null ? result.nextPage : undefined;
        maxPages--;
      }

      let now = new Date().toISOString().replace('Z', '');

      return {
        inputs: allRecords.map(record => ({
          opportunityId: record.id,
          record,
          detectedAt: now
        })),
        updatedState: {
          lastPollTime: now
        }
      };
    },

    handleEvent: async ctx => {
      let record = ctx.input.record;
      let isNew = record.dateCreated === record.dateUpdated;

      return {
        type: isNew ? 'opportunity.created' : 'opportunity.updated',
        id: `opportunity-${ctx.input.opportunityId}-${ctx.input.detectedAt}`,
        output: {
          opportunityId: ctx.input.opportunityId,
          reference: record.reference || null,
          total: record.total ?? null,
          salesProbability: record.salesProbability ?? null,
          statusId: record.statusId || null,
          accountId1: record.accountId1 || null,
          salesRepId: record.salesRepId || null,
          salesForecastDate: record.salesForecastDate || null,
          wonDate: record.wonDate || null,
          lostDate: record.lostDate || null,
          dateCreated: record.dateCreated || null,
          dateUpdated: record.dateUpdated || null,
          record
        }
      };
    }
  })
  .build();
