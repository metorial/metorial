import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let createRepository = SlateTool.create(spec, {
  name: 'Create Repository',
  key: 'create_repository',
  description: `Create a new GitHub repository for the authenticated user or within an organization.
Supports initializing with a README, gitignore template, and license.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Repository name'),
      description: z.string().optional().describe('Repository description'),
      private: z
        .boolean()
        .optional()
        .describe('Whether the repository should be private (default: false)'),
      autoInit: z.boolean().optional().describe('Initialize with a README'),
      gitignoreTemplate: z
        .string()
        .optional()
        .describe('Gitignore template name (e.g., "Node", "Python")'),
      licenseTemplate: z
        .string()
        .optional()
        .describe('License template (e.g., "mit", "apache-2.0")'),
      org: z
        .string()
        .optional()
        .describe(
          'Organization to create the repository in. If omitted, creates under the authenticated user.'
        )
    })
  )
  .output(
    z.object({
      repositoryId: z.number().describe('Unique repository ID'),
      name: z.string().describe('Repository name'),
      fullName: z.string().describe('Full name in owner/repo format'),
      htmlUrl: z.string().describe('URL to the repository on GitHub'),
      cloneUrl: z.string().describe('HTTPS clone URL'),
      sshUrl: z.string().describe('SSH clone URL'),
      private: z.boolean().describe('Whether the repository is private'),
      defaultBranch: z.string().describe('Default branch name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });
    let repo = await client.createRepository(ctx.input);

    return {
      output: {
        repositoryId: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        htmlUrl: repo.html_url,
        cloneUrl: repo.clone_url,
        sshUrl: repo.ssh_url,
        private: repo.private,
        defaultBranch: repo.default_branch
      },
      message: `Created ${repo.private ? 'private' : 'public'} repository **${repo.full_name}** — ${repo.html_url}`
    };
  })
  .build();
