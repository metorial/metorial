import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let jobMonitor = SlateTrigger.create(spec, {
  name: 'Job Monitor',
  key: 'job_monitor',
  description:
    '[Polling fallback] Poll for recently completed test jobs on Sauce Labs. Detects new VDC jobs by periodically checking the jobs list. Useful when webhooks are not configured.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type'),
      jobId: z.string().describe('Job ID'),
      payload: z.any().describe('Job data')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Test job identifier'),
      jobName: z.string().optional().describe('Test name'),
      owner: z.string().optional().describe('Job owner username'),
      status: z.string().optional().describe('Job status (passed, failed, errored, complete)'),
      passed: z.boolean().nullable().optional().describe('Whether the test passed'),
      browser: z.string().optional().describe('Browser name'),
      browserVersion: z.string().optional().describe('Browser version'),
      os: z.string().optional().describe('Operating system'),
      automationBackend: z.string().optional().describe('Automation framework'),
      buildName: z.string().optional().describe('Build name'),
      tags: z.array(z.string()).optional().describe('Job tags'),
      creationTime: z.number().optional().describe('Creation time (Unix timestamp)'),
      duration: z.number().optional().describe('Duration in seconds'),
      error: z.string().nullable().optional().describe('Error message if any')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);
      let state = ctx.state ?? {};
      let lastTimestamp: number = state.lastTimestamp ?? Math.floor(Date.now() / 1000) - 120;

      let jobs = await client.listJobs({
        limit: 50,
        from: lastTimestamp
      });

      let jobsArr = Array.isArray(jobs) ? jobs : [];
      let knownIds: string[] = state.knownIds ?? [];

      let newJobs = jobsArr.filter((j: any) => !knownIds.includes(j.id));

      let updatedKnownIds = jobsArr.map((j: any) => j.id).slice(0, 200);
      let newTimestamp =
        jobsArr.length > 0
          ? Math.max(...jobsArr.map((j: any) => j.creation_time ?? lastTimestamp))
          : lastTimestamp;

      return {
        inputs: newJobs.map((j: any) => {
          let statusLower = (j.consolidated_status ?? j.status ?? '').toLowerCase();
          let eventType =
            j.passed === true
              ? 'job.passed'
              : j.passed === false
                ? 'job.failed'
                : `job.${statusLower || 'completed'}`;

          return {
            eventType,
            jobId: j.id,
            payload: j
          };
        }),
        updatedState: {
          lastTimestamp: newTimestamp,
          knownIds: updatedKnownIds
        }
      };
    },

    handleEvent: async ctx => {
      let j = ctx.input.payload;

      return {
        type: ctx.input.eventType,
        id: ctx.input.jobId,
        output: {
          jobId: j.id,
          jobName: j.name,
          owner: j.owner,
          status: j.consolidated_status ?? j.status,
          passed: j.passed,
          browser: j.browser,
          browserVersion: j.browser_version,
          os: j.os,
          automationBackend: j.automation_backend,
          buildName: j.build,
          tags: j.tags,
          creationTime: j.creation_time,
          duration: j.duration,
          error: j.error
        }
      };
    }
  })
  .build();
