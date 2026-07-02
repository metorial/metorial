import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { bitbucketServiceError } from '../lib/errors';
import { spec } from '../spec';

export let updateRepositoryTool = SlateTool.create(spec, {
  name: 'Update Repository',
  key: 'update_repository',
  description: `Update repository settings (issue tracker, wiki, fork policy, project, privacy, language, name, description). Omit a field to leave it unchanged.`
})
  .input(
    z.object({
      repoSlug: z.string().describe('Repository slug to update'),
      name: z.string().optional().describe('Display name to set'),
      description: z.string().optional().describe('New description'),
      isPrivate: z.boolean().optional().describe('Set repository privacy'),
      language: z.string().optional().describe('Primary programming language'),
      projectKey: z.string().optional().describe('Move repository to a different project'),
      forkPolicy: z
        .enum(['allow_forks', 'no_public_forks', 'no_forks'])
        .optional()
        .describe('Fork policy'),
      hasIssues: z.boolean().optional().describe('Enable or disable the issue tracker'),
      hasWiki: z.boolean().optional().describe('Enable or disable the wiki')
    })
  )
  .output(
    z.object({
      repoSlug: z.string(),
      fullName: z.string(),
      htmlUrl: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, workspace: ctx.config.workspace });
    let slug = ctx.input.repoSlug;

    let body: Record<string, any> = {};
    if (ctx.input.name !== undefined) {
      body.name = ctx.input.name;
    }
    if (ctx.input.description !== undefined) {
      body.description = ctx.input.description;
    }
    if (ctx.input.isPrivate !== undefined) {
      body.is_private = ctx.input.isPrivate;
    }
    if (ctx.input.language !== undefined) {
      body.language = ctx.input.language;
    }
    if (ctx.input.projectKey) {
      body.project = { key: ctx.input.projectKey };
    }
    if (ctx.input.forkPolicy !== undefined) {
      body.fork_policy = ctx.input.forkPolicy;
    }
    if (ctx.input.hasIssues !== undefined) {
      body.has_issues = ctx.input.hasIssues;
    }
    if (ctx.input.hasWiki !== undefined) {
      body.has_wiki = ctx.input.hasWiki;
    }

    if (Object.keys(body).length === 0) {
      throw bitbucketServiceError('At least one repository field is required for update');
    }

    let r = await client.updateRepository(slug, body);

    return {
      output: {
        repoSlug: r.slug,
        fullName: r.full_name,
        htmlUrl: r.links?.html?.href || undefined
      },
      message: `Updated repository **${r.full_name}**.`
    };
  })
  .build();
