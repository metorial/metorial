import { SlateTool } from 'slates';
import { z } from 'zod';
import { GiteaClient } from '../lib/client';
import { spec } from '../spec';

export let getRepo = SlateTool.create(spec, {
  name: 'Get Repository',
  key: 'get_repo',
  description: `Retrieve detailed information about a specific repository including its configuration, statistics, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner username or organization name'),
      repo: z.string().describe('Repository name')
    })
  )
  .output(
    z.object({
      repositoryId: z.number().describe('Repository ID'),
      name: z.string().describe('Repository name'),
      fullName: z.string().describe('Full repository name (owner/name)'),
      description: z.string().describe('Repository description'),
      htmlUrl: z.string().describe('Web URL of the repository'),
      cloneUrl: z.string().describe('HTTPS clone URL'),
      sshUrl: z.string().describe('SSH clone URL'),
      isPrivate: z.boolean().describe('Whether the repository is private'),
      isFork: z.boolean().describe('Whether the repository is a fork'),
      isMirror: z.boolean().describe('Whether the repository is a mirror'),
      isArchived: z.boolean().describe('Whether the repository is archived'),
      isEmpty: z.boolean().describe('Whether the repository is empty'),
      defaultBranch: z.string().describe('Default branch name'),
      starsCount: z.number().describe('Number of stars'),
      forksCount: z.number().describe('Number of forks'),
      watchersCount: z.number().describe('Number of watchers'),
      openIssuesCount: z.number().describe('Number of open issues'),
      openPrCount: z.number().describe('Number of open pull requests'),
      hasIssues: z.boolean().describe('Whether issues are enabled'),
      hasWiki: z.boolean().describe('Whether wiki is enabled'),
      hasPullRequests: z.boolean().describe('Whether pull requests are enabled'),
      language: z.string().describe('Primary language'),
      ownerLogin: z.string().describe('Owner username'),
      topics: z.array(z.string()).describe('Repository topics'),
      size: z.number().describe('Repository size in KB'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let r = await client.getRepo(ctx.input.owner, ctx.input.repo);
    let topics = await client.listRepoTopics(ctx.input.owner, ctx.input.repo);

    return {
      output: {
        repositoryId: r.id,
        name: r.name,
        fullName: r.full_name,
        description: r.description || '',
        htmlUrl: r.html_url,
        cloneUrl: r.clone_url,
        sshUrl: r.ssh_url,
        isPrivate: r.private,
        isFork: r.fork,
        isMirror: r.mirror,
        isArchived: r.archived,
        isEmpty: r.empty,
        defaultBranch: r.default_branch,
        starsCount: r.stars_count,
        forksCount: r.forks_count,
        watchersCount: r.watchers_count,
        openIssuesCount: r.open_issues_count,
        openPrCount: r.open_pr_counter,
        hasIssues: r.has_issues,
        hasWiki: r.has_wiki,
        hasPullRequests: r.has_pull_requests,
        language: r.language || '',
        ownerLogin: r.owner.login,
        topics,
        size: r.size,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      },
      message: `Retrieved repository **${r.full_name}** (${r.private ? 'private' : 'public'}, ${r.stars_count} stars)`
    };
  })
  .build();
