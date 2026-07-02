import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { DetrackClient } from '../lib/client';
import { spec } from '../spec';

export let jobUpdatesPollingTrigger = SlateTrigger.create(spec, {
  name: 'Job Updates (Polling)',
  key: 'job_updates_polling',
  description:
    '[Polling fallback] Polls Detrack for job updates on a regular interval. Detects new jobs and status changes by comparing against the previous poll. Useful when webhooks are not configured.'
})
  .input(
    z.object({
      jobId: z.string().optional().describe('Detrack job ID'),
      doNumber: z.string().describe('Delivery order number'),
      date: z.string().describe('Job date'),
      status: z.string().describe('Current job status'),
      type: z.string().optional().describe('Job type'),
      assignTo: z.string().optional().describe('Assigned driver/vehicle'),
      address: z.string().optional().describe('Job address')
    })
  )
  .output(
    z.object({
      jobId: z.string().optional().describe('Detrack job ID'),
      doNumber: z.string().describe('Delivery order number'),
      date: z.string().describe('Job date'),
      status: z.string().describe('Current job status'),
      type: z.string().optional().describe('Job type'),
      assignTo: z.string().optional().describe('Assigned driver/vehicle'),
      address: z.string().optional().describe('Job address')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new DetrackClient(ctx.auth.token);

      // Get today's date in YYYY-MM-DD format
      let now = new Date();
      let today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      let previousJobStates: Record<string, string> =
        ((ctx.state as Record<string, unknown>)?.jobStates as Record<string, string>) ?? {};
      let _lastDate: string =
        ((ctx.state as Record<string, unknown>)?.lastDate as string) ?? today;

      // Fetch jobs for today
      let result = await client.listJobs({ date: today, limit: 100 });
      let jobs = result.jobs;

      let inputs: {
        jobId: string | undefined;
        doNumber: string;
        date: string;
        status: string;
        type: string | undefined;
        assignTo: string | undefined;
        address: string | undefined;
      }[] = [];

      let newJobStates: Record<string, string> = {};

      for (let job of jobs) {
        let doNumber = String(job.do_number ?? '');
        let date = String(job.date ?? today);
        let status = String(job.status ?? '');
        let jobKey = `${doNumber}|${date}`;

        newJobStates[jobKey] = status;

        // Emit if this is a new job or status has changed
        let previousStatus = previousJobStates[jobKey];
        if (previousStatus === undefined || previousStatus !== status) {
          inputs.push({
            jobId: job.id ? String(job.id) : undefined,
            doNumber,
            date,
            status,
            type: job.type ? String(job.type) : undefined,
            assignTo: job.assign_to ? String(job.assign_to) : undefined,
            address: job.address ? String(job.address) : undefined
          });
        }
      }

      return {
        inputs,
        updatedState: {
          jobStates: newJobStates,
          lastDate: today
        }
      };
    },

    handleEvent: async ctx => {
      let statusNormalized = ctx.input.status.toLowerCase().replace(/\s+/g, '_');
      let eventType = `job.${statusNormalized}`;

      return {
        type: eventType,
        id: `${ctx.input.doNumber}-${ctx.input.date}-${ctx.input.status}`,
        output: {
          jobId: ctx.input.jobId,
          doNumber: ctx.input.doNumber,
          date: ctx.input.date,
          status: ctx.input.status,
          type: ctx.input.type,
          assignTo: ctx.input.assignTo,
          address: ctx.input.address
        }
      };
    }
  })
  .build();
