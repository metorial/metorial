import { SlateTool } from 'slates';
import { z } from 'zod';
import { AzureDevOpsClient } from '../lib/client';
import { spec } from '../spec';

export let manageRepositoryTool = SlateTool.create(spec, {
  name: 'Manage Repositories',
  key: 'manage_repository',
  description: `List, get, or create Git repositories in a project. Also lists branches and recent commits for a given repository.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      project: z
        .string()
        .optional()
        .describe('Project name or ID. Uses default project from config if not provided.'),
      action: z
        .enum(['list', 'get', 'create', 'list_branches', 'list_commits'])
        .describe('Action to perform'),
      repositoryId: z
        .string()
        .optional()
        .describe('Repository name or ID (required for get, list_branches, list_commits)'),
      repositoryName: z
        .string()
        .optional()
        .describe('Name for new repository (required for create)'),
      branch: z
        .string()
        .optional()
        .describe('Branch name filter for list_branches, or branch for list_commits'),
      top: z.number().optional().describe('Max number of commits to return (for list_commits)')
    })
  )
  .output(
    z.object({
      repositories: z
        .array(
          z.object({
            repositoryId: z.string(),
            repositoryName: z.string(),
            defaultBranch: z.string().optional(),
            webUrl: z.string().optional(),
            sshUrl: z.string().optional(),
            remoteUrl: z.string().optional(),
            size: z.number().optional()
          })
        )
        .optional(),
      branches: z
        .array(
          z.object({
            branchName: z.string(),
            objectId: z.string()
          })
        )
        .optional(),
      commits: z
        .array(
          z.object({
            commitId: z.string(),
            authorName: z.string().optional(),
            authorEmail: z.string().optional(),
            authorDate: z.string().optional(),
            committerName: z.string().optional(),
            message: z.string().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new AzureDevOpsClient({
      token: ctx.auth.token,
      organization: ctx.config.organization
    });
    let project = ctx.input.project || ctx.config.project;
    if (!project)
      throw new Error(
        'Project is required. Provide it in the input or set a default project in config.'
      );

    if (ctx.input.action === 'list') {
      let result = await client.listRepositories(project);
      let repos = (result.value || []).map((r: any) => ({
        repositoryId: r.id,
        repositoryName: r.name,
        defaultBranch: r.defaultBranch,
        webUrl: r.webUrl,
        sshUrl: r.sshUrl,
        remoteUrl: r.remoteUrl,
        size: r.size
      }));
      return {
        output: { repositories: repos },
        message: `Found **${repos.length}** repositories in project "${project}".`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.repositoryId)
        throw new Error('repositoryId is required for "get" action');
      let r = await client.getRepository(project, ctx.input.repositoryId);
      return {
        output: {
          repositories: [
            {
              repositoryId: r.id,
              repositoryName: r.name,
              defaultBranch: r.defaultBranch,
              webUrl: r.webUrl,
              sshUrl: r.sshUrl,
              remoteUrl: r.remoteUrl,
              size: r.size
            }
          ]
        },
        message: `Repository **${r.name}** (${r.id})`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.repositoryName)
        throw new Error('repositoryName is required for "create" action');
      let r = await client.createRepository(project, ctx.input.repositoryName);
      return {
        output: {
          repositories: [
            {
              repositoryId: r.id,
              repositoryName: r.name,
              defaultBranch: r.defaultBranch,
              webUrl: r.webUrl,
              sshUrl: r.sshUrl,
              remoteUrl: r.remoteUrl
            }
          ]
        },
        message: `Created repository **${r.name}** (${r.id})`
      };
    }

    if (ctx.input.action === 'list_branches') {
      if (!ctx.input.repositoryId)
        throw new Error('repositoryId is required for "list_branches" action');
      let result = await client.listBranches(
        project,
        ctx.input.repositoryId,
        ctx.input.branch
      );
      let branches = (result.value || []).map((b: any) => ({
        branchName: b.name,
        objectId: b.objectId
      }));
      return {
        output: { branches },
        message: `Found **${branches.length}** branches.`
      };
    }

    if (ctx.input.action === 'list_commits') {
      if (!ctx.input.repositoryId)
        throw new Error('repositoryId is required for "list_commits" action');
      let result = await client.getCommits(project, ctx.input.repositoryId, {
        branch: ctx.input.branch,
        top: ctx.input.top || 20
      });
      let commits = (result.value || []).map((c: any) => ({
        commitId: c.commitId,
        authorName: c.author?.name,
        authorEmail: c.author?.email,
        authorDate: c.author?.date,
        committerName: c.committer?.name,
        message: c.comment
      }));
      return {
        output: { commits },
        message: `Found **${commits.length}** commits.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
