import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let getRepository = SlateTool.create(spec, {
  name: 'Get Repository',
  key: 'get_repository',
  description: `Retrieve detailed information about a GitHub repository including its settings, statistics, and metadata.
Use this to inspect a repository's configuration, check its visibility, default branch, language, star/fork counts, and more.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner (user or organization)'),
      repo: z.string().describe('Repository name')
    })
  )
  .output(
    z.object({
      repositoryId: z.number().describe('Unique repository ID'),
      name: z.string().describe('Repository name'),
      fullName: z.string().describe('Full name in owner/repo format'),
      owner: z.string().describe('Repository owner login'),
      private: z.boolean().describe('Whether the repository is private'),
      description: z.string().nullable().describe('Repository description'),
      htmlUrl: z.string().describe('URL to the repository on GitHub'),
      defaultBranch: z.string().describe('Default branch name'),
      language: z.string().nullable().describe('Primary programming language'),
      stargazersCount: z.number().describe('Number of stars'),
      forksCount: z.number().describe('Number of forks'),
      openIssuesCount: z.number().describe('Number of open issues'),
      archived: z.boolean().describe('Whether the repository is archived'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp'),
      pushedAt: z.string().nullable().describe('Last push timestamp'),
      topics: z.array(z.string()).describe('Repository topics'),
      hasIssues: z.boolean().describe('Whether issues are enabled'),
      hasWiki: z.boolean().describe('Whether wiki is enabled'),
      hasProjects: z.boolean().describe('Whether projects are enabled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });
    let repo = await client.getRepository(ctx.input.owner, ctx.input.repo);

    return {
      output: {
        repositoryId: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner.login,
        private: repo.private,
        description: repo.description,
        htmlUrl: repo.html_url,
        defaultBranch: repo.default_branch,
        language: repo.language,
        stargazersCount: repo.stargazers_count,
        forksCount: repo.forks_count,
        openIssuesCount: repo.open_issues_count,
        archived: repo.archived,
        createdAt: repo.created_at,
        updatedAt: repo.updated_at,
        pushedAt: repo.pushed_at,
        topics: repo.topics ?? [],
        hasIssues: repo.has_issues,
        hasWiki: repo.has_wiki,
        hasProjects: repo.has_projects
      },
      message: `Retrieved repository **${repo.full_name}** — ${repo.private ? 'private' : 'public'}, ${repo.stargazers_count} stars, default branch \`${repo.default_branch}\`.`
    };
  })
  .build();
