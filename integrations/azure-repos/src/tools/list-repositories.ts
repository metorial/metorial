import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listRepositories = SlateTool.create(spec, {
  name: 'List Repositories',
  key: 'list_repositories',
  description: `Lists all Git repositories in the configured Azure DevOps project. Returns repository metadata including name, default branch, size, fork status, and URLs.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      repositories: z.array(
        z.object({
          repositoryId: z.string().describe('Unique identifier of the repository'),
          name: z.string().describe('Name of the repository'),
          defaultBranch: z.string().optional().describe('Default branch of the repository'),
          size: z.number().describe('Size of the repository in bytes'),
          webUrl: z.string().describe('Web URL to view the repository'),
          remoteUrl: z.string().optional().describe('Git remote URL for cloning'),
          sshUrl: z.string().optional().describe('SSH URL for cloning'),
          isFork: z.boolean().optional().describe('Whether this repository is a fork'),
          isDisabled: z.boolean().optional().describe('Whether this repository is disabled'),
          projectName: z.string().describe('Name of the parent project')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organization: ctx.config.organization,
      project: ctx.config.project
    });

    let repos = await client.listRepositories();

    return {
      output: {
        repositories: repos.map(repo => ({
          repositoryId: repo.id,
          name: repo.name,
          defaultBranch: repo.defaultBranch,
          size: repo.size,
          webUrl: repo.webUrl,
          remoteUrl: repo.remoteUrl,
          sshUrl: repo.sshUrl,
          isFork: repo.isFork,
          isDisabled: repo.isDisabled,
          projectName: repo.project?.name ?? ctx.config.project
        }))
      },
      message: `Found **${repos.length}** repositories in project **${ctx.config.project}**.`
    };
  })
  .build();
