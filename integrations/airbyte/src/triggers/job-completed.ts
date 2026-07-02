import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let jobCompletedTrigger = SlateTrigger.create(spec, {
  name: 'Job Completed',
  key: 'job_completed',
  description:
    '[Polling fallback] Polls for completed Airbyte sync and reset jobs. Triggers when a job reaches a terminal state (succeeded, failed, or cancelled). Can filter by connection and job type.'
})
  .input(
    z.object({
      jobId: z.number(),
      status: z.string(),
      jobType: z.string(),
      startTime: z.string(),
      connectionId: z.string(),
      lastUpdatedAt: z.string().optional(),
      duration: z.string().optional(),
      bytesSynced: z.number().optional(),
      rowsSynced: z.number().optional()
    })
  )
  .output(
    z.object({
      jobId: z.number(),
      status: z.string(),
      jobType: z.string(),
      startTime: z.string(),
      connectionId: z.string(),
      lastUpdatedAt: z.string().optional(),
      duration: z.string().optional(),
      bytesSynced: z.number().optional(),
      rowsSynced: z.number().optional()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);

      let lastSeenJobId = (ctx.state as any)?.lastSeenJobId as number | undefined;

      // Fetch recent jobs sorted by most recently updated
      let result = await client.listJobs({
        limit: 50,
        orderBy: 'updatedAt|DESC'
      });

      // Filter to terminal states and only jobs newer than lastSeenJobId
      let terminalStatuses = ['succeeded', 'failed', 'cancelled'];
      let newJobs = result.data.filter(j => {
        if (!terminalStatuses.includes(j.status)) return false;
        if (lastSeenJobId !== undefined && j.jobId <= lastSeenJobId) return false;
        return true;
      });

      let newLastSeenJobId = lastSeenJobId;
      if (result.data.length > 0) {
        let maxJobId = Math.max(...result.data.map(j => j.jobId));
        if (newLastSeenJobId === undefined || maxJobId > newLastSeenJobId) {
          newLastSeenJobId = maxJobId;
        }
      }

      return {
        inputs: newJobs.map(j => ({
          jobId: j.jobId,
          status: j.status,
          jobType: j.jobType,
          startTime: j.startTime,
          connectionId: j.connectionId,
          lastUpdatedAt: j.lastUpdatedAt,
          duration: j.duration,
          bytesSynced: j.bytesSynced,
          rowsSynced: j.rowsSynced
        })),
        updatedState: {
          lastSeenJobId: newLastSeenJobId
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `job.${ctx.input.status}`,
        id: String(ctx.input.jobId),
        output: {
          jobId: ctx.input.jobId,
          status: ctx.input.status,
          jobType: ctx.input.jobType,
          startTime: ctx.input.startTime,
          connectionId: ctx.input.connectionId,
          lastUpdatedAt: ctx.input.lastUpdatedAt,
          duration: ctx.input.duration,
          bytesSynced: ctx.input.bytesSynced,
          rowsSynced: ctx.input.rowsSynced
        }
      };
    }
  })
  .build();
