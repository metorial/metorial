import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { spec } from '../spec';
import { mapBuild, paginationInput, requireString } from './shared';

export let buildActor = SlateTool.create(spec, {
  name: 'Build Actor',
  key: 'build_actor',
  description: `Start an Apify Actor build, retrieve build details, or list builds for an Actor. Builds compile Actor versions into runnable Docker images.`,
  instructions: [
    'Use action=build with actorId and version to start a new build.',
    'Use action=get with buildId to check status.',
    'Use action=list with actorId to inspect previous builds.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['build', 'get', 'list']).describe('Action to perform'),
      actorId: z.string().optional().describe('Actor ID; required for build/list'),
      buildId: z.string().optional().describe('Build ID; required for get'),
      version: z.string().optional().describe('Actor version number; required for build'),
      tag: z.string().optional().describe('Build tag, such as latest'),
      useCache: z.boolean().optional().describe('Whether to use Docker layer cache'),
      betaPackages: z.boolean().optional().describe('Whether to use beta Apify packages'),
      waitForFinish: z
        .number()
        .optional()
        .describe('Seconds Apify should wait for the build to finish before returning'),
      ...paginationInput
    })
  )
  .output(
    z.object({
      buildId: z.string().optional().describe('Build ID'),
      actorId: z.string().optional().describe('Actor ID'),
      status: z.string().optional().describe('Build status'),
      startedAt: z.string().optional().describe('Build start timestamp'),
      finishedAt: z.string().optional().describe('Build finish timestamp'),
      buildNumber: z.string().optional().describe('Build number'),
      versionNumber: z.string().optional().describe('Actor version number'),
      builds: z.array(z.record(z.string(), z.any())).optional().describe('Build list'),
      total: z.number().optional().describe('Total builds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApifyClient({ token: ctx.auth.token });

    if (ctx.input.action === 'build') {
      let actorId = requireString(ctx.input.actorId, 'actorId', 'build');
      let version = requireString(ctx.input.version, 'version', 'build');
      let build = await client.buildActor(actorId, {
        version,
        tag: ctx.input.tag,
        useCache: ctx.input.useCache,
        betaPackages: ctx.input.betaPackages,
        waitForFinish: ctx.input.waitForFinish
      });
      let output = mapBuild(build);

      return {
        output,
        message: `Build started for Actor \`${actorId}\` version \`${version}\`. Build ID: \`${output.buildId}\`, status: **${output.status}**.`
      };
    }

    if (ctx.input.action === 'get') {
      let buildId = requireString(ctx.input.buildId, 'buildId', 'get');
      let build = await client.getBuild(buildId);
      let output = mapBuild(build);
      return {
        output,
        message: `Build \`${output.buildId}\` status: **${output.status}**.`
      };
    }

    let actorId = requireString(ctx.input.actorId, 'actorId', 'list');
    let result = await client.listBuilds(actorId, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      desc: ctx.input.descending
    });
    let builds = result.items.map(mapBuild);

    return {
      output: { builds, total: result.total },
      message: `Found **${result.total}** build(s) for Actor \`${actorId}\`, showing **${builds.length}**.`
    };
  })
  .build();
