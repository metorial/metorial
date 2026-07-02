import { SlateTool } from 'slates';
import { z } from 'zod';
import { GiteaClient } from '../lib/client';
import { spec } from '../spec';

export let updateRepo = SlateTool.create(spec, {
  name: 'Update Repository',
  key: 'update_repo',
  description: `Update a repository's settings including name, description, visibility, archive status, feature toggles, topics, and default branch.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner username or organization name'),
      repo: z.string().describe('Repository name'),
      name: z.string().optional().describe('New repository name'),
      description: z.string().optional().describe('New description'),
      isPrivate: z.boolean().optional().describe('Set private/public visibility'),
      isArchived: z.boolean().optional().describe('Archive or unarchive the repository'),
      defaultBranch: z.string().optional().describe('Change the default branch'),
      hasIssues: z.boolean().optional().describe('Enable or disable issues'),
      hasWiki: z.boolean().optional().describe('Enable or disable wiki'),
      hasPullRequests: z.boolean().optional().describe('Enable or disable pull requests'),
      hasProjects: z.boolean().optional().describe('Enable or disable projects'),
      topics: z.array(z.string()).optional().describe('Replace all repository topics')
    })
  )
  .output(
    z.object({
      repositoryId: z.number().describe('Repository ID'),
      name: z.string().describe('Repository name'),
      fullName: z.string().describe('Full repository name (owner/name)'),
      htmlUrl: z.string().describe('Web URL of the repository'),
      isPrivate: z.boolean().describe('Whether the repository is private'),
      isArchived: z.boolean().describe('Whether the repository is archived'),
      defaultBranch: z.string().describe('Default branch name'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });

    let r = await client.updateRepo(ctx.input.owner, ctx.input.repo, {
      name: ctx.input.name,
      description: ctx.input.description,
      private: ctx.input.isPrivate,
      archived: ctx.input.isArchived,
      defaultBranch: ctx.input.defaultBranch,
      hasIssues: ctx.input.hasIssues,
      hasWiki: ctx.input.hasWiki,
      hasPullRequests: ctx.input.hasPullRequests,
      hasProjects: ctx.input.hasProjects
    });

    if (ctx.input.topics !== undefined) {
      let repoName = ctx.input.name || ctx.input.repo;
      await client.updateRepoTopics(r.owner.login, repoName, ctx.input.topics);
    }

    return {
      output: {
        repositoryId: r.id,
        name: r.name,
        fullName: r.full_name,
        htmlUrl: r.html_url,
        isPrivate: r.private,
        isArchived: r.archived,
        defaultBranch: r.default_branch,
        updatedAt: r.updated_at
      },
      message: `Updated repository **${r.full_name}**`
    };
  })
  .build();
