import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let buildEvents = SlateTrigger.create(spec, {
  name: 'Build Events',
  key: 'build_events',
  description:
    "Triggers when a build changes state (scheduled, running, failing, finished, skipped). Configure a webhook in your Buildkite organization's Notification Services settings and point it to the provided webhook URL."
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Type of build event (build.scheduled, build.running, build.failing, build.finished, build.skipped)'
        ),
      eventId: z.string().describe('Unique event identifier'),
      buildId: z.string().describe('UUID of the build'),
      buildNumber: z.number().describe('Build number'),
      pipelineSlug: z.string().describe('Slug of the pipeline'),
      pipelineName: z.string().describe('Name of the pipeline'),
      state: z.string().describe('Current state of the build'),
      branch: z.string().describe('Branch the build ran on'),
      commit: z.string().describe('Commit SHA'),
      message: z.string().nullable().describe('Build message'),
      webUrl: z.string().describe('URL to the build on Buildkite'),
      creatorName: z.string().nullable().describe('Name of the build creator'),
      createdAt: z.string().describe('When the build was created'),
      startedAt: z.string().nullable().describe('When the build started'),
      finishedAt: z.string().nullable().describe('When the build finished')
    })
  )
  .output(
    z.object({
      buildId: z.string().describe('UUID of the build'),
      buildNumber: z.number().describe('Build number within the pipeline'),
      pipelineSlug: z.string().describe('Slug of the pipeline'),
      pipelineName: z.string().describe('Name of the pipeline'),
      state: z.string().describe('Current state of the build'),
      branch: z.string().describe('Branch the build ran on'),
      commit: z.string().describe('Commit SHA'),
      message: z.string().nullable().describe('Build message'),
      webUrl: z.string().describe('URL to the build on Buildkite'),
      creatorName: z.string().nullable().describe('Name of the build creator'),
      createdAt: z.string().describe('When the build was created'),
      startedAt: z.string().nullable().describe('When the build started'),
      finishedAt: z.string().nullable().describe('When the build finished')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let event = data.event as string | undefined;

      if (!event?.startsWith('build.')) {
        return { inputs: [] };
      }

      let build = data.build;
      let pipeline = data.pipeline;

      if (!build || !pipeline) {
        return { inputs: [] };
      }

      let eventId = `${event}-${build.id}-${build.state ?? build.number}`;

      return {
        inputs: [
          {
            eventType: event,
            eventId,
            buildId: build.id,
            buildNumber: build.number,
            pipelineSlug: pipeline.slug,
            pipelineName: pipeline.name,
            state: build.state ?? '',
            branch: build.branch ?? '',
            commit: build.commit ?? '',
            message: build.message ?? null,
            webUrl: build.web_url ?? '',
            creatorName: build.creator?.name ?? null,
            createdAt: build.created_at ?? '',
            startedAt: build.started_at ?? null,
            finishedAt: build.finished_at ?? null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          buildId: ctx.input.buildId,
          buildNumber: ctx.input.buildNumber,
          pipelineSlug: ctx.input.pipelineSlug,
          pipelineName: ctx.input.pipelineName,
          state: ctx.input.state,
          branch: ctx.input.branch,
          commit: ctx.input.commit,
          message: ctx.input.message,
          webUrl: ctx.input.webUrl,
          creatorName: ctx.input.creatorName,
          createdAt: ctx.input.createdAt,
          startedAt: ctx.input.startedAt,
          finishedAt: ctx.input.finishedAt
        }
      };
    }
  });
