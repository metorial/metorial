import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageReleaseTool = SlateTool.create(spec, {
  name: 'Manage Release',
  key: 'manage_release',
  description: `Create, retrieve, update, or delete a release. Also supports listing releases and creating deploys. Releases track versions of your application and can be associated with commits for suspect commit detection.`,
  instructions: [
    'To create: provide version and projects array. Optionally include commits for suspect commit linking.',
    'To get/update/delete: provide the version string',
    'To deploy: provide version, environment, and optionally dateStarted/dateFinished'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete', 'deploy'])
        .describe('Action to perform'),
      version: z
        .string()
        .optional()
        .describe('Release version identifier (required for get/create/update/delete/deploy)'),
      projects: z
        .array(z.string())
        .optional()
        .describe('Project slugs to associate (required for create)'),
      ref: z.string().optional().describe('Git ref (commit SHA or tag)'),
      url: z.string().optional().describe('URL for the release'),
      dateReleased: z
        .string()
        .optional()
        .describe('ISO 8601 date when the release was deployed'),
      commits: z
        .array(
          z.object({
            commitId: z.string().describe('Commit SHA'),
            repository: z.string().optional().describe('Repository name (e.g. "owner/repo")'),
            message: z.string().optional(),
            authorName: z.string().optional(),
            authorEmail: z.string().optional(),
            timestamp: z.string().optional()
          })
        )
        .optional()
        .describe('Commits to associate with the release'),
      environment: z
        .string()
        .optional()
        .describe('Deploy environment (required for deploy action)'),
      query: z.string().optional().describe('Search query for listing releases'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      release: z.any().optional().describe('Release data'),
      releases: z.array(z.any()).optional().describe('List of releases'),
      deploy: z.any().optional().describe('Deploy data'),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.action === 'list') {
      let releases = await client.listReleases({
        query: ctx.input.query,
        cursor: ctx.input.cursor
      });

      return {
        output: { releases },
        message: `Found **${(releases || []).length}** releases.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.version) throw new Error('version is required');
      let release = await client.getRelease(ctx.input.version);

      return {
        output: { release },
        message: `Retrieved release **${ctx.input.version}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.version) throw new Error('version is required');
      if (!ctx.input.projects || ctx.input.projects.length === 0)
        throw new Error('projects array is required');

      let commits = ctx.input.commits?.map(c => ({
        id: c.commitId,
        repository: c.repository,
        message: c.message,
        authorName: c.authorName,
        authorEmail: c.authorEmail,
        timestamp: c.timestamp
      }));

      let release = await client.createRelease({
        version: ctx.input.version,
        projects: ctx.input.projects,
        ref: ctx.input.ref,
        url: ctx.input.url,
        dateReleased: ctx.input.dateReleased,
        commits
      });

      return {
        output: { release },
        message: `Created release **${ctx.input.version}** for projects: ${ctx.input.projects.join(', ')}.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.version) throw new Error('version is required');

      let release = await client.updateRelease(ctx.input.version, {
        ref: ctx.input.ref,
        url: ctx.input.url,
        dateReleased: ctx.input.dateReleased
      });

      return {
        output: { release },
        message: `Updated release **${ctx.input.version}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.version) throw new Error('version is required');
      await client.deleteRelease(ctx.input.version);

      return {
        output: { deleted: true },
        message: `Deleted release **${ctx.input.version}**.`
      };
    }

    if (ctx.input.action === 'deploy') {
      if (!ctx.input.version) throw new Error('version is required');
      if (!ctx.input.environment) throw new Error('environment is required for deploy');

      let deploy = await client.createReleaseDeploy(ctx.input.version, {
        environment: ctx.input.environment,
        dateStarted: ctx.input.dateReleased,
        dateFinished: ctx.input.dateReleased
      });

      return {
        output: { deploy },
        message: `Deployed release **${ctx.input.version}** to **${ctx.input.environment}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
