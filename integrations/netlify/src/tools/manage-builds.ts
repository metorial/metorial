import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { netlifyServiceError } from '../lib/errors';
import { spec } from '../spec';

let buildOutputSchema = z.object({
  buildId: z.string().describe('Build identifier'),
  deployId: z.string().optional().describe('Deploy created by the build'),
  sha: z.string().optional().describe('Commit SHA for the build'),
  done: z.boolean().optional().describe('Whether the build has completed'),
  error: z.string().optional().describe('Build error message, if any'),
  createdAt: z.string().optional().describe('Build creation timestamp')
});

let mapBuild = (build: any) => ({
  buildId: build.id,
  deployId: build.deploy_id,
  sha: build.sha,
  done: build.done,
  error: build.error,
  createdAt: build.created_at
});

export let manageBuilds = SlateTool.create(spec, {
  name: 'Manage Builds',
  key: 'manage_builds',
  description: `List builds for a Netlify site, get a build by ID, or trigger a new build for a site.`
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'create']).describe('Action to perform'),
      siteId: z.string().optional().describe('Site ID for list or create actions'),
      buildId: z.string().optional().describe('Build ID for get action'),
      page: z.number().optional().describe('Page number for listing builds'),
      perPage: z.number().optional().describe('Number of builds per page'),
      branch: z.string().optional().describe('Branch to build when creating a build'),
      clearCache: z
        .boolean()
        .optional()
        .describe('Whether to clear the build cache before creating a build'),
      image: z.string().optional().describe('Build image tag to use when creating a build'),
      templateId: z
        .string()
        .optional()
        .describe('Build template ID to use when creating a build'),
      title: z.string().optional().describe('Build title when creating a build')
    })
  )
  .output(
    z.object({
      builds: z
        .array(buildOutputSchema)
        .optional()
        .describe('Builds returned for list action'),
      build: buildOutputSchema.optional().describe('Build returned for get or create action')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    switch (ctx.input.action) {
      case 'list': {
        if (!ctx.input.siteId) {
          throw netlifyServiceError('siteId is required for list action');
        }
        let builds = await client.listBuilds(ctx.input.siteId, {
          page: ctx.input.page,
          perPage: ctx.input.perPage
        });
        let mapped = builds.map(mapBuild);
        return {
          output: { builds: mapped },
          message: `Found **${mapped.length}** build(s) for site **${ctx.input.siteId}**.`
        };
      }
      case 'get': {
        if (!ctx.input.buildId) {
          throw netlifyServiceError('buildId is required for get action');
        }
        let build = await client.getBuild(ctx.input.buildId);
        return {
          output: { build: mapBuild(build) },
          message: `Retrieved build **${ctx.input.buildId}**.`
        };
      }
      case 'create': {
        if (!ctx.input.siteId) {
          throw netlifyServiceError('siteId is required for create action');
        }
        let build = await client.createBuild(ctx.input.siteId, {
          branch: ctx.input.branch,
          clearCache: ctx.input.clearCache,
          image: ctx.input.image,
          templateId: ctx.input.templateId,
          title: ctx.input.title
        });
        return {
          output: { build: mapBuild(build) },
          message: `Created build **${build.id}** for site **${ctx.input.siteId}**.`
        };
      }
    }
  })
  .build();
