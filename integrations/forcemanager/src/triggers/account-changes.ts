import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let accountChanges = SlateTrigger.create(spec, {
  name: 'Account Changes',
  key: 'account_changes',
  description: 'Triggers when accounts (companies) are created or updated in ForceManager.'
})
  .input(
    z.object({
      accountId: z.number().describe('Account ID'),
      record: z.any().describe('Full account record'),
      detectedAt: z.string().describe('Timestamp when the change was detected')
    })
  )
  .output(
    z.object({
      accountId: z.number().describe('Account ID'),
      name: z.string().nullable().describe('Company name'),
      email: z.string().nullable().describe('Email address'),
      phone: z.string().nullable().describe('Phone number'),
      city: z.string().nullable().describe('City'),
      statusId: z.any().nullable().describe('Account status'),
      typeId: z.any().nullable().describe('Account type'),
      salesRepId1: z.any().nullable().describe('Primary sales rep'),
      dateCreated: z.string().nullable().describe('Record creation date'),
      dateUpdated: z.string().nullable().describe('Record last update date'),
      record: z.any().describe('Full account record')
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
        let result = await client.listModifiedSince('companies', lastPollTime, page);
        allRecords.push(...result.records);
        page = result.nextPage !== null ? result.nextPage : undefined;
        maxPages--;
      }

      let now = new Date().toISOString().replace('Z', '');

      return {
        inputs: allRecords.map(record => ({
          accountId: record.id,
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
        type: isNew ? 'account.created' : 'account.updated',
        id: `account-${ctx.input.accountId}-${ctx.input.detectedAt}`,
        output: {
          accountId: ctx.input.accountId,
          name: record.name || null,
          email: record.email || null,
          phone: record.phone || null,
          city: record.city || null,
          statusId: record.statusId || null,
          typeId: record.typeId || null,
          salesRepId1: record.salesRepId1 || null,
          dateCreated: record.dateCreated || null,
          dateUpdated: record.dateUpdated || null,
          record
        }
      };
    }
  })
  .build();
