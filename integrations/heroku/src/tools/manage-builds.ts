import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { herokuServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageBuilds = SlateTool.create(spec, {
  name: 'Manage Builds',
  key: 'manage_builds',
  description: `List, get, or create builds for a Heroku app. Builds compile source code into slugs that can be deployed as releases. Use this for non-interactive CI/CD workflows.`,
  instructions: ['For "create", provide a sourceUrl pointing to a tarball of the source code.']
})
  .input(
    z.object({
      appIdOrName: z.string().describe('App name or unique identifier'),
      action: z.enum(['list', 'get', 'create']).describe('Operation to perform'),
      buildId: z.string().optional().describe('Build ID (required for "get" action)'),
      sourceUrl: z
        .string()
        .optional()
        .describe('URL of the source tarball (required for "create" action)'),
      sourceVersion: z
        .string()
        .optional()
        .describe('Version identifier for the source (for "create" action)'),
      checksum: z
        .string()
        .optional()
        .describe('SHA256 checksum of the source (for "create" action)')
    })
  )
  .output(
    z.object({
      builds: z.array(
        z.object({
          buildId: z.string().describe('Unique identifier of the build'),
          status: z.string().describe('Build status (pending, succeeded, failed)'),
          outputStreamUrl: z.string().nullable().describe('URL to stream build output'),
          sourceUrl: z.string().nullable().describe('Source blob URL'),
          sourceVersion: z.string().nullable().describe('Source version'),
          createdAt: z.string().describe('When the build was created'),
          updatedAt: z.string().describe('When the build was last updated'),
          userEmail: z.string().describe('Email of the user who triggered the build'),
          slugId: z.string().nullable().describe('ID of the resulting slug')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { appIdOrName, action } = ctx.input;

    let mapBuild = (b: any) => ({
      buildId: b.buildId,
      status: b.status,
      outputStreamUrl: b.outputStreamUrl,
      sourceUrl: b.sourceUrl,
      sourceVersion: b.sourceVersion,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
      userEmail: b.userEmail,
      slugId: b.slugId
    });

    if (action === 'list') {
      let builds = await client.listBuilds(appIdOrName);
      return {
        output: { builds: builds.map(mapBuild) },
        message: `Found **${builds.length}** build(s) for app **${appIdOrName}**.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.buildId)
        throw herokuServiceError('buildId is required for "get" action.');
      let build = await client.getBuild(appIdOrName, ctx.input.buildId);
      return {
        output: { builds: [mapBuild(build)] },
        message: `Build **${build.buildId}** status: ${build.status}.`
      };
    }

    // create
    if (!ctx.input.sourceUrl)
      throw herokuServiceError('sourceUrl is required for "create" action.');
    let build = await client.createBuild(appIdOrName, {
      sourceUrl: ctx.input.sourceUrl,
      sourceVersion: ctx.input.sourceVersion,
      checksum: ctx.input.checksum
    });
    return {
      output: { builds: [mapBuild(build)] },
      message: `Created build **${build.buildId}** for app **${appIdOrName}** (status: ${build.status}).`
    };
  })
  .build();
