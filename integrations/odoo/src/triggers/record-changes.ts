import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let recordChanges = SlateTrigger.create(spec, {
  name: 'Record Changes',
  key: 'record_changes',
  description:
    'Polls for new or recently modified records in a specified Odoo model. Detects record creation and updates based on the write_date field.'
})
  .input(
    z.object({
      changeType: z
        .enum(['created', 'updated'])
        .describe('Whether this record was newly created or updated'),
      recordId: z.number().describe('The Odoo record ID'),
      model: z.string().describe('The model the record belongs to'),
      record: z.record(z.string(), z.unknown()).describe('The full record data'),
      writeDate: z.string().describe('The write_date timestamp of the record')
    })
  )
  .output(
    z.object({
      recordId: z.number().describe('The Odoo record ID'),
      model: z.string().describe('The model the record belongs to'),
      changeType: z
        .enum(['created', 'updated'])
        .describe('Whether this record was newly created or updated'),
      record: z.record(z.string(), z.unknown()).describe('The full record data'),
      writeDate: z.string().describe('The write_date timestamp'),
      createDate: z.string().optional().describe('The create_date timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);

      let state = ctx.state as { lastPollDate?: string; model?: string } | null;
      let lastPollDate = state?.lastPollDate;

      // We need to know which model to poll. We read it from the previous state
      // or default to a commonly-used model. The model must be set by the first poll.
      // Since Odoo has no universal event stream, we poll a specific model's write_date.
      // The trigger configuration should specify which model via the state.
      let model = state?.model || 'res.partner';

      let domain: Array<string | [string, string, unknown]> = [];
      if (lastPollDate) {
        domain = [['write_date', '>', lastPollDate]];
      }

      let records = await client.searchRead(model, domain, {
        fields: ['id', 'write_date', 'create_date'],
        order: 'write_date asc',
        limit: 200
      });

      // For each record, determine if it was created or updated by comparing create_date and write_date
      let inputs = records.map(record => {
        let writeDate = record.write_date as string;
        let createDate = record.create_date as string;
        let isNew = createDate === writeDate;

        return {
          changeType: (isNew ? 'created' : 'updated') as 'created' | 'updated',
          recordId: record.id as number,
          model,
          record,
          writeDate
        };
      });

      let newLastPollDate =
        records.length > 0
          ? (records[records.length - 1]!.write_date as string)
          : lastPollDate;

      return {
        inputs,
        updatedState: {
          lastPollDate: newLastPollDate,
          model
        }
      };
    },

    handleEvent: async ctx => {
      let client = createClient(ctx);

      // Fetch full record data for the event
      let fullRecords = await client.read(ctx.input.model, [ctx.input.recordId]);
      let fullRecord = fullRecords[0] || ctx.input.record;

      return {
        type: `record.${ctx.input.changeType}`,
        id: `${ctx.input.model}-${ctx.input.recordId}-${ctx.input.writeDate}`,
        output: {
          recordId: ctx.input.recordId,
          model: ctx.input.model,
          changeType: ctx.input.changeType,
          record: fullRecord,
          writeDate: ctx.input.writeDate,
          createDate: fullRecord.create_date as string | undefined
        }
      };
    }
  })
  .build();
