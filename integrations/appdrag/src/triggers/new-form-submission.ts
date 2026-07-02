import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { AppDragClient } from '../lib/client';
import { spec } from '../spec';

export let newFormSubmission = SlateTrigger.create(spec, {
  name: 'New Form Submission',
  key: 'new_form_submission',
  description:
    'Triggers when a new form submission is detected in the cloud database. Polls a specified form submissions table for new rows.'
})
  .input(
    z.object({
      submissionId: z.string().describe('Unique ID of the form submission.'),
      submittedAt: z.string().describe('Timestamp when the form was submitted.'),
      formData: z.record(z.string(), z.any()).describe('The submitted form field values.')
    })
  )
  .output(
    z.object({
      submissionId: z.string().describe('Unique ID of the form submission.'),
      submittedAt: z.string().describe('Timestamp when the form was submitted.'),
      formData: z.record(z.string(), z.any()).describe('The submitted form field values.')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new AppDragClient({
        apiKey: ctx.auth.token,
        appId: ctx.config.appId
      });

      let lastTimestamp = (ctx.state as any)?.lastTimestamp || '1970-01-01 00:00:00';

      let result = await client.sqlSelect(
        `SELECT * FROM AD_FORM WHERE createdAt > '${lastTimestamp}' ORDER BY createdAt DESC LIMIT 100`
      );

      let rows: any[] = Array.isArray(result) ? result : result?.Table || [];

      let inputs = rows.map((row: any) => {
        let { id, createdAt, ...formFields } = row;
        return {
          submissionId: String(id || row.ID || ''),
          submittedAt: String(createdAt || row.createdAt || ''),
          formData: formFields
        };
      });

      let newLastTimestamp =
        rows.length > 0
          ? String(rows[0]!.createdAt || rows[0]!.CreatedAt || lastTimestamp)
          : lastTimestamp;

      return {
        inputs,
        updatedState: {
          lastTimestamp: newLastTimestamp
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'form_submission.created',
        id: ctx.input.submissionId,
        output: {
          submissionId: ctx.input.submissionId,
          submittedAt: ctx.input.submittedAt,
          formData: ctx.input.formData
        }
      };
    }
  })
  .build();
