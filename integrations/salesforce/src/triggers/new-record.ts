import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createSalesforceClient } from '../lib/client';
import { spec } from '../spec';

export let newRecord = SlateTrigger.create(spec, {
  name: 'New Record',
  key: 'new_record',
  description:
    'Triggers when a new record is created in Salesforce for a specified object type. Uses SOQL to query for recently created records ordered by creation date. Set the objectType, fields, and optional condition in the initial state.'
})
  .input(
    z.object({
      recordId: z.string().describe('ID of the new record'),
      objectType: z.string().describe('The Salesforce object type'),
      createdDate: z.string().describe('When the record was created'),
      record: z.record(z.string(), z.any()).describe('The full record data')
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('ID of the new record'),
      objectType: z.string().describe('The Salesforce object type'),
      createdDate: z.string().describe('When the record was created'),
      record: z.record(z.string(), z.any()).describe('The full record data')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createSalesforceClient({
        instanceUrl: ctx.auth.instanceUrl,
        apiVersion: ctx.config.apiVersion,
        token: ctx.auth.token
      });

      let state = ctx.input.state || {};
      let objectType = (state.objectType as string) || 'Account';
      let fields = (state.fields as string[]) || [];
      let condition = (state.condition as string) || '';
      let lastCreatedDate = state.lastCreatedDate as string | undefined;

      let now = new Date();
      if (!lastCreatedDate) {
        lastCreatedDate = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      }

      let fieldSet = new Set(['Id', 'CreatedDate', ...fields]);
      let fieldList = Array.from(fieldSet).join(', ');

      let whereClause = `CreatedDate > ${lastCreatedDate}`;
      if (condition) {
        whereClause += ` AND (${condition})`;
      }

      let soql = `SELECT ${fieldList} FROM ${objectType} WHERE ${whereClause} ORDER BY CreatedDate ASC LIMIT 200`;

      let result = await client.query(soql);
      let records: any[] = result.records || [];

      let inputs = records.map((record: any) => ({
        recordId: record.Id as string,
        objectType,
        createdDate: record.CreatedDate as string,
        record
      }));

      let newLastCreatedDate =
        records.length > 0 ? records[records.length - 1].CreatedDate : lastCreatedDate;

      return {
        inputs,
        updatedState: {
          lastCreatedDate: newLastCreatedDate,
          objectType,
          fields,
          condition
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `${ctx.input.objectType.toLowerCase()}.created`,
        id: ctx.input.recordId,
        output: {
          recordId: ctx.input.recordId,
          objectType: ctx.input.objectType,
          createdDate: ctx.input.createdDate,
          record: ctx.input.record
        }
      };
    }
  })
  .build();
