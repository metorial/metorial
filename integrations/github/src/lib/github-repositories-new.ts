import { GitHubClient, type GitHubClientConfig } from './client';

export class GitHubRepositorySyncApi {
  private client: GitHubClient;

  constructor(auth: GitHubClientConfig) {
    this.client = new GitHubClient(auth);
  }

  async listStarredRepositories(params: {
    username?: string;
    sort?: string;
    direction?: string;
    perPage?: number;
    page?: number;
  }) {
    let path = params.username
      ? `/users/${encodeURIComponent(params.username)}/starred`
      : '/user/starred';
    return await this.client.requestRest<Record<string, any>[]>({
      method: 'GET',
      path,
      operation: 'list starred repositories',
      reason: 'github_list_starred_repositories_failed',
      query: {
        sort: params.sort,
        direction: params.direction,
        per_page: params.perPage,
        page: params.page
      }
    });
  }
}
