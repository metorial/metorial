import { expectMcpCompatibleToolSchema } from '@slates/test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { GitHubClient } from './lib/client';
import { forkRepository } from './tools/fork-repository';
import { listStarredRepositories } from './tools/list-starred-repositories';

const schema = (tool: any) => z.toJSONSchema(tool.inputSchema) as any;

const invoke = (tool: any, input: Record<string, unknown>) =>
  tool.handleInvocation({
    auth: { token: 'test-token', instanceUrl: 'https://github.com' },
    config: {},
    input
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GitHub synced repository tool schemas', () => {
  it('matches the official fork_repository contract', () => {
    expectMcpCompatibleToolSchema(forkRepository);
    expect(`github-${forkRepository.key}`.length).toBeLessThan(60);

    let input = schema(forkRepository);
    expect(Object.keys(input.properties)).toEqual(['owner', 'repo', 'organization']);
    expect(input.required).toEqual(['owner', 'repo']);
  });

  it('matches the official list_starred_repositories contract', () => {
    expectMcpCompatibleToolSchema(listStarredRepositories);
    expect(`github-${listStarredRepositories.key}`.length).toBeLessThan(60);

    let input = schema(listStarredRepositories);
    expect(Object.keys(input.properties)).toEqual([
      'username',
      'sort',
      'direction',
      'perPage',
      'page'
    ]);
    expect(input.required).toBeUndefined();
    expect(input.properties.sort.enum).toEqual(['created', 'updated']);
    expect(input.properties.direction.enum).toEqual(['asc', 'desc']);
    expect(input.properties.perPage).toMatchObject({ minimum: 1, maximum: 100 });
    expect(input.properties.page.minimum).toBe(1);
  });
});

describe('GitHub synced repository requests', () => {
  it('creates a fork through the shared REST foundation and returns cleanup-useful metadata', async () => {
    let requestRest = vi.spyOn(GitHubClient.prototype, 'requestRest').mockResolvedValue({
      id: 42,
      full_name: 'octo-org/hello-world',
      name: 'hello-world',
      owner: { login: 'octo-org' },
      html_url: 'https://github.com/octo-org/hello-world',
      default_branch: 'main',
      private: true
    });

    let result = await invoke(forkRepository, {
      owner: 'upstream-owner',
      repo: 'hello-world',
      organization: 'octo-org'
    });

    expect(requestRest).toHaveBeenCalledWith({
      method: 'POST',
      path: '/repos/upstream-owner/hello-world/forks',
      operation: 'fork repository',
      reason: 'github_fork_repository_failed',
      body: { organization: 'octo-org' }
    });
    expect(result.output).toEqual({
      repositoryId: 42,
      fullName: 'octo-org/hello-world',
      htmlUrl: 'https://github.com/octo-org/hello-world',
      defaultBranch: 'main',
      private: true,
      status: 'created'
    });
  });

  it('lists a user’s starred repositories rather than repository stargazers', async () => {
    let requestRest = vi.spyOn(GitHubClient.prototype, 'requestRest').mockResolvedValue([
      {
        id: 1,
        full_name: 'octocat/hello-world',
        html_url: 'https://github.com/octocat/hello-world'
      }
    ]);

    let result = await invoke(listStarredRepositories, {
      username: 'octo cat',
      sort: 'updated',
      direction: 'desc',
      perPage: 50,
      page: 2
    });

    expect(requestRest).toHaveBeenCalledWith({
      method: 'GET',
      path: '/users/octo%20cat/starred',
      operation: 'list starred repositories',
      reason: 'github_list_starred_repositories_failed',
      query: {
        sort: 'updated',
        direction: 'desc',
        per_page: 50,
        page: 2
      }
    });
    expect(result.output).toMatchObject({
      username: 'octo cat',
      returnedCount: 1,
      repositories: [{ id: 1, full_name: 'octocat/hello-world' }]
    });
  });
});
