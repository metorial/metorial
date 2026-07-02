import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let jobEvents = SlateTrigger.create(spec, {
  name: 'Job Events',
  key: 'job_events',
  description:
    "Triggers when a job (build step) changes state (scheduled, started, finished, activated/unblocked). Configure a webhook in your Buildkite organization's Notification Services settings and point it to the provided webhook URL."
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Type of job event (job.scheduled, job.started, job.finished, job.activated)'
        ),
      eventId: z.string().describe('Unique event identifier'),
      jobId: z.string().describe('UUID of the job'),
      jobName: z.string().nullable().describe('Name/label of the job step'),
      jobState: z.string().describe('Current state of the job'),
      jobType: z.string().describe('Type of job (script, waiter, manual, trigger)'),
      exitStatus: z.number().nullable().describe('Exit status code if finished'),
      buildId: z.string().describe('UUID of the build'),
      buildNumber: z.number().describe('Build number'),
      pipelineSlug: z.string().describe('Slug of the pipeline'),
      pipelineName: z.string().describe('Name of the pipeline'),
      agentName: z.string().nullable().describe('Name of the agent running the job')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('UUID of the job'),
      jobName: z.string().nullable().describe('Name/label of the job step'),
      jobState: z.string().describe('Current state of the job'),
      jobType: z.string().describe('Type of job'),
      exitStatus: z.number().nullable().describe('Exit status code if finished'),
      buildId: z.string().describe('UUID of the build'),
      buildNumber: z.number().describe('Build number'),
      pipelineSlug: z.string().describe('Slug of the pipeline'),
      pipelineName: z.string().describe('Name of the pipeline'),
      agentName: z.string().nullable().describe('Name of the agent running the job')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let event = data.event as string | undefined;

      if (!event?.startsWith('job.')) {
        return { inputs: [] };
      }

      let job = data.job;
      let build = data.build;
      let pipeline = data.pipeline;

      if (!job || !build || !pipeline) {
        return { inputs: [] };
      }

      let eventId = `${event}-${job.id}-${job.state ?? ''}`;

      return {
        inputs: [
          {
            eventType: event,
            eventId,
            jobId: job.id,
            jobName: job.name ?? null,
            jobState: job.state ?? '',
            jobType: job.type ?? '',
            exitStatus: job.exit_status ?? null,
            buildId: build.id,
            buildNumber: build.number,
            pipelineSlug: pipeline.slug,
            pipelineName: pipeline.name,
            agentName: job.agent?.name ?? null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          jobId: ctx.input.jobId,
          jobName: ctx.input.jobName,
          jobState: ctx.input.jobState,
          jobType: ctx.input.jobType,
          exitStatus: ctx.input.exitStatus,
          buildId: ctx.input.buildId,
          buildNumber: ctx.input.buildNumber,
          pipelineSlug: ctx.input.pipelineSlug,
          pipelineName: ctx.input.pipelineName,
          agentName: ctx.input.agentName
        }
      };
    }
  });
