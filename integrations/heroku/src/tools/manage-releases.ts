import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { herokuServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageReleases = SlateTool.create(spec, {
  name: 'Manage Releases',
  key: 'manage_releases',
  description: `List releases, get release details, or rollback to a previous release for a Heroku app. Releases track each deployment and config change, allowing you to roll back if needed.`,
  instructions: [
    'For "rollback", provide the slug ID from the target release to roll back to.'
  ]
})
  .input(
    z.object({
      appIdOrName: z.string().describe('App name or unique identifier'),
      action: z.enum(['list', 'get', 'rollback']).describe('Operation to perform'),
      releaseIdOrVersion: z
        .string()
        .optional()
        .describe('Release ID or version number (for "get" action)'),
      slugId: z.string().optional().describe('Slug ID to deploy (for "rollback" action)')
    })
  )
  .output(
    z.object({
      releases: z.array(
        z.object({
          releaseId: z.string().describe('Unique identifier of the release'),
          version: z.number().describe('Sequential release version number'),
          description: z.string().describe('Description of the release'),
          status: z.string().describe('Release status'),
          current: z.boolean().describe('Whether this is the current release'),
          createdAt: z.string().describe('When the release was created'),
          userEmail: z.string().describe('Email of the user who created the release'),
          slugId: z.string().nullable().describe('ID of the slug used for this release')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { appIdOrName, action } = ctx.input;

    let mapRelease = (r: any) => ({
      releaseId: r.releaseId,
      version: r.version,
      description: r.description,
      status: r.status,
      current: r.current,
      createdAt: r.createdAt,
      userEmail: r.userEmail,
      slugId: r.slugId
    });

    if (action === 'list') {
      let releases = await client.listReleases(appIdOrName);
      return {
        output: { releases: releases.map(mapRelease) },
        message: `Found **${releases.length}** release(s) for app **${appIdOrName}**.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.releaseIdOrVersion)
        throw herokuServiceError('releaseIdOrVersion is required for "get" action.');
      let release = await client.getRelease(appIdOrName, ctx.input.releaseIdOrVersion);
      return {
        output: { releases: [mapRelease(release)] },
        message: `Release v${release.version}: ${release.description} (${release.status}).`
      };
    }

    // rollback
    if (!ctx.input.slugId)
      throw herokuServiceError('slugId is required for "rollback" action.');
    let release = await client.rollback(appIdOrName, ctx.input.slugId);
    return {
      output: { releases: [mapRelease(release)] },
      message: `Rolled back app **${appIdOrName}** to v${release.version}.`
    };
  })
  .build();
