import { SlateTool } from 'slates';
import { z } from 'zod';
import { GiteaClient } from '../lib/client';
import { spec } from '../spec';

export let createRepo = SlateTool.create(spec, {
  name: 'Create Repository',
  key: 'create_repo',
  description: `Create a new Git repository under the authenticated user's account or under a specified organization. Supports initialization with README, gitignore, and license files.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Repository name'),
      description: z.string().optional().describe('Repository description'),
      isPrivate: z.boolean().optional().describe('Whether the repository should be private'),
      autoInit: z
        .boolean()
        .optional()
        .describe('Initialize repository with a README (default: false)'),
      defaultBranch: z.string().optional().describe('Default branch name (default: main)'),
      gitignores: z
        .string()
        .optional()
        .describe('Gitignore template name (e.g., "Go", "Node", "Python")'),
      license: z
        .string()
        .optional()
        .describe('License template name (e.g., "MIT", "Apache-2.0")'),
      organization: z
        .string()
        .optional()
        .describe(
          'Organization name to create the repo under; if omitted, creates under the authenticated user'
        )
    })
  )
  .output(
    z.object({
      repositoryId: z.number().describe('Repository ID'),
      name: z.string().describe('Repository name'),
      fullName: z.string().describe('Full repository name (owner/name)'),
      htmlUrl: z.string().describe('Web URL of the repository'),
      cloneUrl: z.string().describe('HTTPS clone URL'),
      isPrivate: z.boolean().describe('Whether the repository is private'),
      defaultBranch: z.string().describe('Default branch name'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });

    let r: any;
    if (ctx.input.organization) {
      r = await client.createOrgRepo(ctx.input.organization, {
        name: ctx.input.name,
        description: ctx.input.description,
        private: ctx.input.isPrivate,
        autoInit: ctx.input.autoInit,
        defaultBranch: ctx.input.defaultBranch
      });
    } else {
      r = await client.createRepo({
        name: ctx.input.name,
        description: ctx.input.description,
        private: ctx.input.isPrivate,
        autoInit: ctx.input.autoInit,
        defaultBranch: ctx.input.defaultBranch,
        gitignores: ctx.input.gitignores,
        license: ctx.input.license
      });
    }

    return {
      output: {
        repositoryId: r.id,
        name: r.name,
        fullName: r.full_name,
        htmlUrl: r.html_url,
        cloneUrl: r.clone_url,
        isPrivate: r.private,
        defaultBranch: r.default_branch,
        createdAt: r.created_at
      },
      message: `Created repository **${r.full_name}** (${r.private ? 'private' : 'public'})`
    };
  })
  .build();
