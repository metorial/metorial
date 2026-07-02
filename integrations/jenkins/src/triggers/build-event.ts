import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { JenkinsClient } from '../lib/client';
import { spec } from '../spec';

export let buildEvent = SlateTrigger.create(spec, {
  name: 'Build Event',
  key: 'build_event',
  description:
    'Triggers when a build starts, completes (success, failure, unstable, or aborted) on monitored Jenkins jobs. Polls job build histories for new builds since the last check.'
})
  .input(
    z.object({
      eventType: z
        .enum(['started', 'success', 'failure', 'unstable', 'aborted', 'completed'])
        .describe('Type of build event'),
      buildNumber: z.number().describe('Build number'),
      jobName: z.string().describe('Name of the job'),
      jobFullName: z.string().describe('Fully qualified job name'),
      buildUrl: z.string().describe('URL of the build'),
      result: z.string().optional().nullable().describe('Build result'),
      building: z.boolean().describe('Whether the build is currently running'),
      timestamp: z.number().describe('Build start timestamp in milliseconds'),
      duration: z.number().describe('Build duration in milliseconds')
    })
  )
  .output(
    z.object({
      buildNumber: z.number().describe('Build number'),
      jobName: z.string().describe('Name of the job'),
      jobFullName: z.string().describe('Fully qualified job name'),
      buildUrl: z.string().describe('URL of the build'),
      result: z
        .string()
        .optional()
        .nullable()
        .describe('Build result (SUCCESS, FAILURE, UNSTABLE, ABORTED)'),
      building: z.boolean().describe('Whether the build is currently running'),
      timestamp: z.number().describe('Build start timestamp in milliseconds'),
      duration: z.number().describe('Build duration in milliseconds')
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
      let lastPolledBuilds: Record<string, number> = state.lastPolledBuilds || {};
      let inputs: any[] = [];

      try {
        let jobs = await client.listJobs();
        let buildableJobs = jobs.filter((j: any) => j.buildable);

        for (let job of buildableJobs) {
          try {
            let builds = await client.getBuilds(job.name, 5);
            let lastKnownBuild = lastPolledBuilds[job.name] || 0;
            let maxBuildNumber = lastKnownBuild;

            for (let build of builds) {
              if (build.number > lastKnownBuild) {
                let eventType: string;
                if (build.building) {
                  eventType = 'started';
                } else if (build.result === 'SUCCESS') {
                  eventType = 'success';
                } else if (build.result === 'FAILURE') {
                  eventType = 'failure';
                } else if (build.result === 'UNSTABLE') {
                  eventType = 'unstable';
                } else if (build.result === 'ABORTED') {
                  eventType = 'aborted';
                } else {
                  eventType = 'completed';
                }

                inputs.push({
                  eventType,
                  buildNumber: build.number,
                  jobName: job.name,
                  jobFullName: job.fullName || job.name,
                  buildUrl: build.url,
                  result: build.result,
                  building: build.building || false,
                  timestamp: build.timestamp || 0,
                  duration: build.duration || 0
                });

                if (build.number > maxBuildNumber) {
                  maxBuildNumber = build.number;
                }
              }
            }

            if (maxBuildNumber > lastKnownBuild) {
              lastPolledBuilds[job.name] = maxBuildNumber;
            }
          } catch {
            // Skip jobs we can't access
          }
        }
      } catch (err) {
        ctx.error(`Failed to poll for build events: ${err}`);
      }

      return {
        inputs,
        updatedState: { lastPolledBuilds }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `build.${ctx.input.eventType}`,
        id: `${ctx.input.jobFullName}-${ctx.input.buildNumber}-${ctx.input.eventType}`,
        output: {
          buildNumber: ctx.input.buildNumber,
          jobName: ctx.input.jobName,
          jobFullName: ctx.input.jobFullName,
          buildUrl: ctx.input.buildUrl,
          result: ctx.input.result,
          building: ctx.input.building,
          timestamp: ctx.input.timestamp,
          duration: ctx.input.duration
        }
      };
    }
  })
  .build();
