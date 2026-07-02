import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { JenkinsClient } from '../lib/client';
import { spec } from '../spec';

export let jobStatusChange = SlateTrigger.create(spec, {
  name: 'Job Status Change',
  key: 'job_status_change',
  description:
    "Triggers when a job's status color changes (e.g. from blue/success to red/failure, or becomes disabled). Useful for monitoring overall job health changes rather than individual builds."
})
  .input(
    z.object({
      jobName: z.string().describe('Name of the job'),
      jobUrl: z.string().describe('URL of the job'),
      previousColor: z.string().describe('Previous status color'),
      currentColor: z.string().describe('Current status color'),
      changeDetectedAt: z.string().describe('ISO timestamp when the change was detected')
    })
  )
  .output(
    z.object({
      jobName: z.string().describe('Name of the job'),
      jobUrl: z.string().describe('URL of the job'),
      previousColor: z
        .string()
        .describe(
          'Previous status color (blue=success, red=failure, yellow=unstable, disabled, notbuilt, aborted)'
        ),
      currentColor: z.string().describe('Current status color'),
      changeDetectedAt: z.string().describe('ISO timestamp when the change was detected')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new JenkinsClient({
        instanceUrl: ctx.config.instanceUrl,
        username: ctx.auth.username,
        token: ctx.auth.token
      });

      let state = (ctx.state as Record<string, any>) || {};
      let knownColors: Record<string, string> = state.knownColors || {};
      let inputs: any[] = [];

      try {
        let jobs = await client.listJobs();

        for (let job of jobs) {
          let currentColor = (job.color || 'notbuilt').replace(/_anime$/, '');
          let previousColor = knownColors[job.name];

          if (previousColor && previousColor !== currentColor) {
            inputs.push({
              jobName: job.name,
              jobUrl: job.url,
              previousColor,
              currentColor,
              changeDetectedAt: new Date().toISOString()
            });
          }

          knownColors[job.name] = currentColor;
        }
      } catch (err) {
        ctx.error(`Failed to poll for job status changes: ${err}`);
      }

      return {
        inputs,
        updatedState: { knownColors }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `job.status_changed`,
        id: `${ctx.input.jobName}-${ctx.input.previousColor}-${ctx.input.currentColor}-${ctx.input.changeDetectedAt}`,
        output: {
          jobName: ctx.input.jobName,
          jobUrl: ctx.input.jobUrl,
          previousColor: ctx.input.previousColor,
          currentColor: ctx.input.currentColor,
          changeDetectedAt: ctx.input.changeDetectedAt
        }
      };
    }
  })
  .build();
