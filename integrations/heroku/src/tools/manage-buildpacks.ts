import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { herokuServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageBuildpacks = SlateTool.create(spec, {
  name: 'Manage Buildpacks',
  key: 'manage_buildpacks',
  description: `List, replace, or clear buildpack installations for a Heroku app. Buildpack order determines how Heroku compiles source code during builds.`,
  instructions: [
    'Use "list" before "update" if you need to preserve existing buildpack order.',
    'The "update" action replaces the full buildpack installation list with the provided buildpacks.',
    'Buildpacks can be registry names, URLs, or Heroku buildpack URNs accepted by Heroku.'
  ]
})
  .input(
    z.object({
      appIdOrName: z.string().describe('App name or unique identifier'),
      action: z.enum(['list', 'update', 'clear']).describe('Operation to perform'),
      buildpacks: z
        .array(z.string())
        .optional()
        .describe('Buildpack names, URLs, or URNs in execution order for "update"')
    })
  )
  .output(
    z.object({
      buildpacks: z.array(
        z.object({
          ordinal: z.number().describe('Execution order of the buildpack'),
          buildpackName: z.string().describe('Buildpack registry name, if known'),
          buildpackUrl: z.string().describe('Buildpack URL or internal URN')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { appIdOrName, action } = ctx.input;

    let mapBuildpack = (buildpack: any) => ({
      ordinal: buildpack.ordinal,
      buildpackName: buildpack.buildpackName,
      buildpackUrl: buildpack.buildpackUrl
    });

    if (action === 'list') {
      let buildpacks = await client.listBuildpackInstallations(appIdOrName);
      return {
        output: { buildpacks: buildpacks.map(mapBuildpack) },
        message: `Found **${buildpacks.length}** buildpack(s) for app **${appIdOrName}**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.buildpacks || ctx.input.buildpacks.length === 0) {
        throw herokuServiceError('buildpacks is required for "update" action.');
      }

      let buildpacks = await client.updateBuildpackInstallations(
        appIdOrName,
        ctx.input.buildpacks
      );
      return {
        output: { buildpacks: buildpacks.map(mapBuildpack) },
        message: `Updated **${buildpacks.length}** buildpack(s) for app **${appIdOrName}**.`
      };
    }

    let buildpacks = await client.updateBuildpackInstallations(appIdOrName, []);
    return {
      output: { buildpacks: buildpacks.map(mapBuildpack) },
      message: `Cleared buildpacks for app **${appIdOrName}**.`
    };
  })
  .build();
