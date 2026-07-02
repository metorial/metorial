import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let jobCompleted = SlateTrigger.create(spec, {
  name: 'Job Completed',
  key: 'job_completed',
  description:
    'Triggers when a complete app job has finished processing. The webhook payload contains an array with all result data from the job.'
})
  .input(
    z.object({
      resultRows: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of result data rows from the completed job')
    })
  )
  .output(
    z.object({
      rows: z
        .array(z.record(z.string(), z.unknown()))
        .describe('All result rows from the completed job'),
      rowCount: z.number().describe('Number of result rows')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let webhook = await client.createWebhook({
        webhookName: 'Slates - Job Completed',
        webhookType: 'job',
        endpointUrl: ctx.input.webhookBaseUrl,
        webhookReference: `slates-job-${Date.now()}`
      });

      return {
        registrationDetails: {
          webhookId: webhook.webhookId,
          webhookReference: webhook.webhookReference
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let ref = ctx.input.registrationDetails?.webhookReference;
      if (ref) {
        await client.deleteWebhook(ref);
      }
    },

    handleRequest: async ctx => {
      let data = await ctx.request.json();

      // The webhook payload is an array of result data rows
      let resultRows = Array.isArray(data) ? data : [data];

      return {
        inputs: [
          {
            resultRows
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let rows = ctx.input.resultRows;
      let firstRow = rows[0] || {};
      let eventId = (firstRow.jobId as string) || `job-${Date.now()}`;

      return {
        type: 'job.completed',
        id: eventId,
        output: {
          rows,
          rowCount: rows.length
        }
      };
    }
  })
  .build();
