import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let contactChanges = SlateTrigger.create(spec, {
  name: 'Contact Changes',
  key: 'contact_changes',
  description: 'Triggers when contacts are created or updated in ForceManager.'
})
  .input(
    z.object({
      contactId: z.number().describe('Contact ID'),
      record: z.any().describe('Full contact record'),
      detectedAt: z.string().describe('Timestamp when the change was detected')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('Contact ID'),
      firstName: z.string().nullable().describe('First name'),
      lastName: z.string().nullable().describe('Last name'),
      email: z.string().nullable().describe('Primary email'),
      phone: z.string().nullable().describe('Primary phone'),
      accountId: z.any().nullable().describe('Associated account'),
      dateCreated: z.string().nullable().describe('Record creation date'),
      dateUpdated: z.string().nullable().describe('Record last update date'),
      record: z.any().describe('Full contact record')
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
        let result = await client.listModifiedSince('contacts', lastPollTime, page);
        allRecords.push(...result.records);
        page = result.nextPage !== null ? result.nextPage : undefined;
        maxPages--;
      }

      let now = new Date().toISOString().replace('Z', '');

      return {
        inputs: allRecords.map(record => ({
          contactId: record.id,
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
        type: isNew ? 'contact.created' : 'contact.updated',
        id: `contact-${ctx.input.contactId}-${ctx.input.detectedAt}`,
        output: {
          contactId: ctx.input.contactId,
          firstName: record.firstName || null,
          lastName: record.lastName || null,
          email: record.email || null,
          phone: record.phone1 || null,
          accountId: record.accountId || null,
          dateCreated: record.dateCreated || null,
          dateUpdated: record.dateUpdated || null,
          record
        }
      };
    }
  })
  .build();
