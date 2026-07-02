import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let repositoryOutputSchema = z.object({
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
});

let getProjectName = (repo: { project?: { name?: string } }, fallback: string) =>
  repo.project?.name ?? fallback;

export let createRepository = SlateTool.create(spec, {
  name: 'Create Repository',
  key: 'create_repository',
  description: `Creates a new Git repository in the Azure DevOps project. Optionally creates a fork of an existing repository by specifying a parent repository.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new repository'),
      parentRepositoryId: z
        .string()
        .optional()
        .describe('ID of the parent repository to fork from'),
      parentProjectId: z
        .string()
        .optional()
        .describe('Project ID of the parent repository (for cross-project forks)'),
      sourceRef: z
        .string()
        .optional()
        .describe('Source branch to fork from (e.g., "refs/heads/main")')
    })
  )
  .output(repositoryOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organization: ctx.config.organization,
      project: ctx.config.project
    });

    let repo = await client.createRepository(ctx.input.name, {
      parentRepositoryId: ctx.input.parentRepositoryId,
      parentProjectId: ctx.input.parentProjectId,
      sourceRef: ctx.input.sourceRef
    });

    let isFork = !!ctx.input.parentRepositoryId;
    return {
      output: {
        repositoryId: repo.id,
        name: repo.name,
        defaultBranch: repo.defaultBranch,
        size: repo.size,
        webUrl: repo.webUrl,
        remoteUrl: repo.remoteUrl,
        sshUrl: repo.sshUrl,
        isFork: repo.isFork,
        isDisabled: repo.isDisabled,
        projectName: getProjectName(repo, ctx.config.project)
      },
      message: isFork
        ? `Forked repository **${repo.name}** from parent repository.`
        : `Created repository **${repo.name}** in project **${ctx.config.project}**.`
    };
  })
  .build();

export let updateRepository = SlateTool.create(spec, {
  name: 'Update Repository',
  key: 'update_repository',
  description: `Updates an existing Git repository's settings. Can rename, change the default branch, or enable/disable the repository.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      repositoryId: z.string().describe('ID of the repository to update'),
      name: z.string().optional().describe('New name for the repository'),
      defaultBranch: z
        .string()
        .optional()
        .describe('New default branch (e.g., "refs/heads/main")'),
      isDisabled: z
        .boolean()
        .optional()
        .describe('Set to true to disable or false to enable the repository')
    })
  )
  .output(repositoryOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organization: ctx.config.organization,
      project: ctx.config.project
    });

    let repo = await client.updateRepository(ctx.input.repositoryId, {
      name: ctx.input.name,
      defaultBranch: ctx.input.defaultBranch,
      isDisabled: ctx.input.isDisabled
    });

    return {
      output: {
        repositoryId: repo.id,
        name: repo.name,
        defaultBranch: repo.defaultBranch,
        size: repo.size,
        webUrl: repo.webUrl,
        remoteUrl: repo.remoteUrl,
        sshUrl: repo.sshUrl,
        isFork: repo.isFork,
        isDisabled: repo.isDisabled,
        projectName: getProjectName(repo, ctx.config.project)
      },
      message: `Updated repository **${repo.name}**.`
    };
  })
  .build();

export let deleteRepository = SlateTool.create(spec, {
  name: 'Delete Repository',
  key: 'delete_repository',
  description: `Permanently deletes a Git repository from the Azure DevOps project. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      repositoryId: z.string().describe('ID of the repository to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the repository was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organization: ctx.config.organization,
      project: ctx.config.project
    });

    await client.deleteRepository(ctx.input.repositoryId);

    return {
      output: { deleted: true },
      message: `Deleted repository **${ctx.input.repositoryId}**.`
    };
  })
  .build();
