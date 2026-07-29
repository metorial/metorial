import { buildApiServiceError, createApiServiceError } from 'slates';
import { GitHubClient } from '../lib/client';

export let createGitHubReadClient = (auth: { token: string; instanceUrl?: string }) =>
  new GitHubClient({
    token: auth.token,
    instanceUrl: auth.instanceUrl
  });

export let githubReadApiError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    providerLabel: 'GitHub',
    operation,
    reason: 'github_api_error',
    detailKeys: ['message', 'documentation_url', 'error_description', 'error'],
    nestedKeys: ['errors']
  });

export let invalidGitHubReadInput = (message: string) =>
  createApiServiceError(message, { reason: 'github_validation_error' });

export let getRestPageMetadata = (
  returnedCount: number,
  params: { page?: number; perPage?: number }
) => ({
  returnedCount,
  page: params.page ?? 1,
  perPage: params.perPage ?? 30
});

export let mapGitHubLabel = (label: any) => ({
  labelId: label.id,
  nodeId: label.node_id,
  name: label.name,
  color: label.color,
  description: label.description ?? null,
  isDefault: label.default ?? false,
  apiUrl: label.url
});
