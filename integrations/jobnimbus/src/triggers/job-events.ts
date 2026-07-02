import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let jobEvents = SlateTrigger.create(spec, {
  name: 'Job Events',
  key: 'job_events',
  description:
    'Triggers when jobs are created or updated in JobNimbus. Polls for recently modified jobs.'
})
  .input(
    z.object({
      jobId: z.string().describe('Unique JobNimbus ID of the job'),
      name: z.string().optional().describe('Job name'),
      description: z.string().optional().describe('Job description'),
      number: z.string().optional().describe('Job number'),
      statusName: z.string().optional().describe('Current workflow status'),
      recordTypeName: z.string().optional().describe('Workflow type name'),
      primaryContactId: z.string().optional().describe('Primary contact ID'),
      primaryContactName: z.string().optional().describe('Primary contact name'),
      tags: z.array(z.string()).optional().describe('Tags'),
      salesRepName: z.string().optional().describe('Sales rep name'),
      dateCreated: z.number().describe('Unix timestamp of creation'),
      dateUpdated: z.number().describe('Unix timestamp of last update')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Unique JobNimbus ID of the job'),
      name: z.string().optional().describe('Job name'),
      description: z.string().optional().describe('Job description'),
      number: z.string().optional().describe('Job number'),
      statusName: z.string().optional().describe('Current workflow status'),
      recordTypeName: z.string().optional().describe('Workflow type name'),
      primaryContactId: z.string().optional().describe('Primary contact ID'),
      primaryContactName: z.string().optional().describe('Primary contact name'),
      tags: z.array(z.string()).optional().describe('Tags'),
      salesRepName: z.string().optional().describe('Sales rep name'),
      dateCreated: z.number().describe('Unix timestamp of creation'),
      dateUpdated: z.number().describe('Unix timestamp of last update')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let lastPolledAt = (ctx.state as any)?.lastPolledAt as number | undefined;
      let now = Math.floor(Date.now() / 1000);

      let filter = lastPolledAt
        ? { must: [{ range: { date_updated: { gte: lastPolledAt } } }] }
        : undefined;

      let result = await client.listJobs({
        size: 100,
        filter
      });

      let inputs = (result.results || []).map((j: any) => ({
        jobId: j.jnid,
        name: j.name,
        description: j.description,
        number: j.number,
        statusName: j.status_name,
        recordTypeName: j.record_type_name,
        primaryContactId: j.primary,
        primaryContactName: j.primary_name,
        tags: j.tags,
        salesRepName: j.sales_rep_name,
        dateCreated: j.date_created,
        dateUpdated: j.date_updated
      }));

      return {
        inputs,
        updatedState: {
          lastPolledAt: now
        }
      };
    },

    handleEvent: async ctx => {
      let isNew = ctx.input.dateCreated === ctx.input.dateUpdated;
      let eventType = isNew ? 'job.created' : 'job.updated';

      return {
        type: eventType,
        id: `${ctx.input.jobId}-${ctx.input.dateUpdated}`,
        output: {
          jobId: ctx.input.jobId,
          name: ctx.input.name,
          description: ctx.input.description,
          number: ctx.input.number,
          statusName: ctx.input.statusName,
          recordTypeName: ctx.input.recordTypeName,
          primaryContactId: ctx.input.primaryContactId,
          primaryContactName: ctx.input.primaryContactName,
          tags: ctx.input.tags,
          salesRepName: ctx.input.salesRepName,
          dateCreated: ctx.input.dateCreated,
          dateUpdated: ctx.input.dateUpdated
        }
      };
    }
  })
  .build();
