import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { spec } from '../spec';

export let buildActor = SlateTool.create(spec, {
  name: 'Build Actor',
  key: 'build_actor',
  description: `Trigger a build for an Actor or retrieve build details. Builds compile Actor source code into runnable Docker images. You can specify version and tag, and list previous builds.`,
  instructions: [
    'Use action "build" with actorId to start a new build.',
    'Use action "get" with buildId to check build status.',
    'Use action "list" with actorId to list previous builds.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['build', 'get', 'list']).describe('Action to perform'),
      actorId: z.string().optional().describe('Actor ID (required for build and list)'),
      buildId: z.string().optional().describe('Build ID (required for get)'),
      version: z.string().optional().describe('Version number to build (for build action)'),
      tag: z.string().optional().describe('Build tag (for build action, e.g. "latest")'),
      useCache: z
        .boolean()
        .optional()
        .describe('Whether to use Docker layer cache (for build action)'),
      limit: z.number().optional().default(25).describe('Max items for list'),
      offset: z.number().optional().default(0).describe('Pagination offset for list')
    })
  )
  .output(
    z.object({
      buildId: z.string().optional().describe('Build ID'),
      actorId: z.string().optional().describe('Actor ID'),
      status: z
        .string()
        .optional()
        .describe('Build status (READY, RUNNING, SUCCEEDED, FAILED, ABORTED, TIMED-OUT)'),
      startedAt: z.string().optional().describe('Build start timestamp'),
      finishedAt: z.string().optional().describe('Build finish timestamp'),
      buildNumber: z.string().optional().describe('Build number'),
      builds: z
        .array(
          z.object({
            buildId: z.string().describe('Build ID'),
            status: z.string().describe('Build status'),
            startedAt: z.string().optional().describe('Start timestamp'),
            finishedAt: z.string().optional().describe('Finish timestamp'),
            buildNumber: z.string().optional().describe('Build number')
          })
        )
        .optional()
        .describe('Build list (for list action)'),
      total: z.number().optional().describe('Total builds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApifyClient({ token: ctx.auth.token });

    if (ctx.input.action === 'build') {
      let build = await client.buildActor(ctx.input.actorId!, {
        version: ctx.input.version,
        tag: ctx.input.tag,
        useCache: ctx.input.useCache
      });

      return {
        output: {
          buildId: build.id,
          actorId: build.actId,
          status: build.status,
          startedAt: build.startedAt,
          finishedAt: build.finishedAt,
          buildNumber: build.buildNumber
        },
        message: `Build started for Actor \`${ctx.input.actorId}\`. Build ID: \`${build.id}\`, Status: **${build.status}**.`
      };
    }

    if (ctx.input.action === 'get') {
      let build = await client.getBuild(ctx.input.buildId!);
      return {
        output: {
          buildId: build.id,
          actorId: build.actId,
          status: build.status,
          startedAt: build.startedAt,
          finishedAt: build.finishedAt,
          buildNumber: build.buildNumber
        },
        message: `Build \`${build.id}\` status: **${build.status}**.`
      };
    }

    // list
    let result = await client.listBuilds(ctx.input.actorId!, {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let builds = result.items.map(item => ({
      buildId: item.id,
      status: item.status,
      startedAt: item.startedAt,
      finishedAt: item.finishedAt,
      buildNumber: item.buildNumber
    }));

    return {
      output: { builds, total: result.total },
      message: `Found **${result.total}** build(s) for Actor \`${ctx.input.actorId}\`, showing **${builds.length}**.`
    };
  })
  .build();
