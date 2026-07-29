import { createApiServiceError } from 'slates';
import { GitHubClient } from './client';

export interface GitHubDiscussionPageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

export interface GitHubDiscussionAuth {
  token: string;
  instanceUrl?: string;
}

export let createGitHubDiscussionClient = (auth: GitHubDiscussionAuth) =>
  new GitHubClient({
    token: auth.token,
    instanceUrl: auth.instanceUrl
  });

export let discussionRepositoryName = (repo?: string) => repo ?? '.github';

export let normalizeDiscussionPageInfo = (
  pageInfo: Partial<GitHubDiscussionPageInfo> | null | undefined
): GitHubDiscussionPageInfo => ({
  hasNextPage: pageInfo?.hasNextPage ?? false,
  hasPreviousPage: pageInfo?.hasPreviousPage ?? false,
  startCursor: pageInfo?.startCursor ?? null,
  endCursor: pageInfo?.endCursor ?? null
});

export let invalidDiscussionInput = (message: string, reason: string) =>
  createApiServiceError(message, { reason });

export let requireDiscussionRepository = <T>(
  repository: T | null | undefined,
  owner: string,
  repo: string
): T => {
  if (repository) return repository;
  throw invalidDiscussionInput(
    `GitHub did not return repository "${owner}/${repo}". Verify the repository name and your access.`,
    'github_discussion_repository_not_found'
  );
};
