import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { TravisCIClient } from '../lib/client';
import { spec } from '../spec';

export let buildEvents = SlateTrigger.create(spec, {
  name: 'Build Events',
  key: 'build_events',
  description:
    'Triggers when builds are created, started, pass, fail, error, or are cancelled. Polls for recent build activity across all repositories or a specific repository.'
})
  .input(
    z.object({
      buildId: z.number().describe('Build ID'),
      buildNumber: z.string().describe('Build number'),
      state: z.string().describe('Build state'),
      previousState: z.string().nullable().describe('Previous build state'),
      eventType: z.string().describe('Event type that triggered the build'),
      branch: z.string().optional().describe('Branch name'),
      commitSha: z.string().optional().describe('Commit SHA'),
      commitMessage: z.string().optional().describe('Commit message'),
      startedAt: z.string().nullable().describe('Build start timestamp'),
      finishedAt: z.string().nullable().describe('Build finish timestamp'),
      duration: z.number().nullable().describe('Build duration in seconds'),
      repositorySlug: z.string().optional().describe('Repository slug'),
      repositoryId: z.number().optional().describe('Repository ID')
    })
  )
  .output(
    z.object({
      buildId: z.number().describe('Build ID'),
      buildNumber: z.string().describe('Build number'),
      state: z.string().describe('Current build state'),
      previousState: z.string().nullable().describe('Previous build state'),
      eventType: z.string().describe('Event type that triggered the build'),
      branch: z.string().optional().describe('Branch name'),
      commitSha: z.string().optional().describe('Commit SHA'),
      commitMessage: z.string().optional().describe('Commit message'),
      startedAt: z.string().nullable().describe('Build start timestamp'),
      finishedAt: z.string().nullable().describe('Build finish timestamp'),
      duration: z.number().nullable().describe('Build duration in seconds'),
      repositorySlug: z.string().optional().describe('Repository slug'),
      repositoryId: z.number().optional().describe('Repository ID')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new TravisCIClient({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      let lastSeenBuildId: number | null = ctx.state?.lastSeenBuildId ?? null;

      let result = await client.listBuilds({
        limit: 25,
        sortBy: 'id:desc'
      });

      let builds: any[] = result.builds || [];

      let newBuilds = lastSeenBuildId
        ? builds.filter((b: any) => b.id > lastSeenBuildId)
        : builds.slice(0, 1);

      let inputs = newBuilds.map((build: any) => ({
        buildId: build.id,
        buildNumber: build.number,
        state: build.state,
        previousState: build.previous_state ?? null,
        eventType: build.event_type,
        branch: build.branch?.name,
        commitSha: build.commit?.sha,
        commitMessage: build.commit?.message,
        startedAt: build.started_at ?? null,
        finishedAt: build.finished_at ?? null,
        duration: build.duration ?? null,
        repositorySlug: build.repository?.slug,
        repositoryId: build.repository?.id
      }));

      let newLastSeenBuildId = builds.length > 0 ? builds[0]!.id : lastSeenBuildId;

      return {
        inputs,
        updatedState: {
          lastSeenBuildId: newLastSeenBuildId
        }
      };
    },

    handleEvent: async ctx => {
      let stateToType: Record<string, string> = {
        created: 'build.created',
        received: 'build.received',
        started: 'build.started',
        passed: 'build.passed',
        failed: 'build.failed',
        errored: 'build.errored',
        canceled: 'build.canceled'
      };

      let type = stateToType[ctx.input.state] || `build.${ctx.input.state}`;

      return {
        type,
        id: `build-${ctx.input.buildId}-${ctx.input.state}`,
        output: {
          buildId: ctx.input.buildId,
          buildNumber: ctx.input.buildNumber,
          state: ctx.input.state,
          previousState: ctx.input.previousState,
          eventType: ctx.input.eventType,
          branch: ctx.input.branch,
          commitSha: ctx.input.commitSha,
          commitMessage: ctx.input.commitMessage,
          startedAt: ctx.input.startedAt,
          finishedAt: ctx.input.finishedAt,
          duration: ctx.input.duration,
          repositorySlug: ctx.input.repositorySlug,
          repositoryId: ctx.input.repositoryId
        }
      };
    }
  })
  .build();
