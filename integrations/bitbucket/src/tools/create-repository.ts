import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createRepositoryTool = SlateTool.create(spec, {
  name: 'Create Repository',
  key: 'create_repository',
  description: `Create a new Git repository in the configured workspace. **Only repoSlug is required.** Display **name** defaults to the slug; **isPrivate** defaults to **true** and is always sent so the create payload matches Bitbucket's expectations. Optional: project, issue tracker, wiki, fork policy, language, description.`
})
  .input(
    z.object({
      repoSlug: z
        .string()
        .describe('URL-friendly repository name (slug); only required field'),
      name: z
        .string()
        .optional()
        .describe('Display name; defaults to **repoSlug** when omitted.'),
      description: z.string().optional().describe('Repository description'),
      isPrivate: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether the repository is private; defaults to **true**.'),
      projectKey: z.string().optional().describe('Project key to assign this repository to'),
      language: z.string().optional().describe('Programming language of the repository'),
      forkPolicy: z
        .enum(['allow_forks', 'no_public_forks', 'no_forks'])
        .optional()
        .describe('Fork policy for the repository'),
      hasIssues: z.boolean().optional().describe('Whether the issue tracker is enabled'),
      hasWiki: z.boolean().optional().describe('Whether the wiki is enabled')
    })
  )
  .output(
    z.object({
      repoSlug: z.string(),
      fullName: z.string(),
      htmlUrl: z.string().optional(),
      isPrivate: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, workspace: ctx.config.workspace });

    let slug = ctx.input.repoSlug.trim();
    let displayName = ctx.input.name?.trim() || slug;

    let body: Record<string, any> = {
      scm: 'git',
      name: displayName,
      is_private: ctx.input.isPrivate ?? true
    };
    if (ctx.input.description !== undefined && ctx.input.description !== '') {
      body.description = ctx.input.description;
    }
    if (ctx.input.projectKey) {
      body.project = { key: ctx.input.projectKey };
    }
    if (ctx.input.language) {
      body.language = ctx.input.language;
    }
    if (ctx.input.forkPolicy) {
      body.fork_policy = ctx.input.forkPolicy;
    }
    if (ctx.input.hasIssues !== undefined) {
      body.has_issues = ctx.input.hasIssues;
    }
    if (ctx.input.hasWiki !== undefined) {
      body.has_wiki = ctx.input.hasWiki;
    }

    let r = await client.createRepository(slug, body);

    return {
      output: {
        repoSlug: r.slug ?? slug,
        fullName: r.full_name,
        htmlUrl: r.links?.html?.href || undefined,
        isPrivate:
          typeof r.is_private === 'boolean' ? r.is_private : (ctx.input.isPrivate ?? true)
      },
      message: `Created repository **${r.full_name}**.`
    };
  })
  .build();
