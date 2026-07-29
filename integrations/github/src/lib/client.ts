import { Buffer } from 'node:buffer';
import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  getResponseHeaderValue,
  requestAxios
} from 'slates';

export interface GitHubClientConfig {
  token: string;
  instanceUrl?: string;
}

export type GitHubRestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface GitHubRestRequestOptions<TBody = unknown> {
  method: GitHubRestMethod;
  path: string;
  operation: string;
  reason: string;
  query?: Record<string, unknown>;
  body?: TBody;
  headers?: Record<string, string>;
}

export interface GitHubRestResult<T> {
  data: T;
  linkHeader?: string;
}

export interface GitHubCursorPageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: string;
  prevCursor?: string;
}

let cursorFromLink = (
  linkHeader: string | undefined,
  relation: 'next' | 'prev',
  parameter: 'after' | 'before'
) => {
  if (!linkHeader) {
    return undefined;
  }
  for (let part of linkHeader.split(',')) {
    let match = /^\s*<([^>]+)>;\s*rel="([^"]+)"\s*$/.exec(part);
    if (match?.[2] === relation) {
      try {
        return new URL(match[1] as string).searchParams.get(parameter) ?? undefined;
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
};

export let cursorPageInfoFromLink = (linkHeader: string | undefined): GitHubCursorPageInfo => {
  let nextCursor = cursorFromLink(linkHeader, 'next', 'after');
  let prevCursor = cursorFromLink(linkHeader, 'prev', 'before');
  return {
    hasNextPage: nextCursor !== undefined,
    hasPreviousPage: prevCursor !== undefined,
    ...(nextCursor ? { nextCursor } : {}),
    ...(prevCursor ? { prevCursor } : {})
  };
};

export type GitHubDownloadMode = 'text' | 'binary';

export interface GitHubDownloadRequestOptions {
  path: string;
  operation: string;
  reason: string;
  mode?: GitHubDownloadMode;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface GitHubDownloadResult {
  bytes: Uint8Array;
  byteLength: number;
  text?: string;
  contentType?: string;
  contentDisposition?: string;
}

let toDownloadBytes = (value: unknown) => {
  if (typeof value === 'string') {
    return Uint8Array.from(Buffer.from(value, 'utf8'));
  }
  if (value instanceof ArrayBuffer) {
    return Uint8Array.from(new Uint8Array(value));
  }
  if (ArrayBuffer.isView(value)) {
    return Uint8Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
  }
  throw createApiServiceError('GitHub returned unsupported downloadable content.', {
    reason: 'github_download_content_unsupported'
  });
};

export class GitHubClient {
  private http: ReturnType<typeof createAxios>;
  private mcpHttp: ReturnType<typeof createAxios>;
  private instanceUrl: string;
  private apiBaseUrl: string;

  constructor(config: GitHubClientConfig) {
    this.instanceUrl = config.instanceUrl?.replace(/\/+$/, '') || 'https://github.com';
    this.apiBaseUrl =
      this.instanceUrl === 'https://github.com'
        ? 'https://api.github.com'
        : `${this.instanceUrl}/api/v3`;

    this.http = createAxios({
      baseURL: this.apiBaseUrl,
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    this.mcpHttp = createAxios({
      headers: {
        Authorization: `Bearer ${config.token}`
      }
    });
  }

  private encodePath(path: string) {
    return path
      .split('/')
      .map(segment => encodeURIComponent(segment))
      .join('/');
  }

  private async read(path: string, operation: string, reason: string, config?: any) {
    try {
      return await this.http.get(path, config);
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'GitHub',
        operation,
        reason,
        nestedKeys: ['errors']
      });
    }
  }

  private async write(
    method: 'post' | 'put' | 'patch' | 'delete',
    path: string,
    data: unknown,
    operation: string,
    reason: string
  ) {
    try {
      if (method === 'delete') {
        return await this.http.delete(path, { data });
      }
      return await this.http[method](path, data);
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'GitHub',
        operation,
        reason,
        nestedKeys: ['errors']
      });
    }
  }

  private async requestRestResponse<T, TBody = unknown>(
    options: GitHubRestRequestOptions<TBody>
  ) {
    return await requestAxios<T>(
      options.operation,
      () =>
        this.http.request<T>({
          method: options.method,
          url: options.path,
          params: options.query,
          data: options.body,
          headers: options.headers
        }),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'GitHub',
          operation,
          reason: options.reason,
          nestedKeys: ['errors']
        })
    );
  }

  async requestRest<T, TBody = unknown>(options: GitHubRestRequestOptions<TBody>): Promise<T> {
    let response = await this.requestRestResponse<T, TBody>(options);
    return response.data;
  }

  async requestRestWithMetadata<T, TBody = unknown>(
    options: GitHubRestRequestOptions<TBody>
  ): Promise<GitHubRestResult<T>> {
    let response = await this.requestRestResponse<T, TBody>(options);
    return {
      data: response.data,
      linkHeader: getResponseHeaderValue(response.headers, 'link')
    };
  }

  async downloadContent(options: GitHubDownloadRequestOptions): Promise<GitHubDownloadResult> {
    let mode = options.mode ?? 'binary';
    let response = await requestAxios<string | ArrayBuffer | Uint8Array>(
      options.operation,
      () =>
        this.http.get(options.path, {
          params: options.query,
          headers: options.headers,
          responseType: mode === 'text' ? 'text' : 'arraybuffer',
          maxRedirects: 5
        }),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'GitHub',
          operation,
          reason: options.reason,
          nestedKeys: ['errors']
        })
    );
    let bytes = toDownloadBytes(response.data);

    return {
      bytes,
      byteLength: bytes.byteLength,
      ...(mode === 'text'
        ? {
            text:
              typeof response.data === 'string'
                ? response.data
                : Buffer.from(bytes).toString('utf8')
          }
        : {}),
      contentType: getResponseHeaderValue(response.headers, 'content-type'),
      contentDisposition: getResponseHeaderValue(response.headers, 'content-disposition')
    };
  }

  getRepositoryHtmlUrl(owner: string, repo: string) {
    return `${this.instanceUrl}/${owner}/${repo}`;
  }

  // ─── Repositories ──────────────────────────────────────────────

  async listRepositories(
    params: {
      type?: string;
      sort?: string;
      direction?: string;
      perPage?: number;
      page?: number;
    } = {}
  ) {
    let response = await this.http.get('/user/repos', {
      params: {
        type: params.type,
        sort: params.sort,
        direction: params.direction,
        per_page: params.perPage,
        page: params.page
      }
    });
    return response.data;
  }

  async getRepository(owner: string, repo: string) {
    let response = await this.http.get(`/repos/${owner}/${repo}`);
    return response.data;
  }

  async getRepositoryTree(
    owner: string,
    repo: string,
    params: {
      treeSha?: string;
      recursive?: boolean;
      pathFilter?: string;
    } = {}
  ) {
    let treeSha = params.treeSha;
    if (!treeSha) {
      let repository = await this.read(
        `/repos/${owner}/${repo}`,
        'get repository information',
        'github_get_repository_tree_repository_failed'
      );
      treeSha = repository.data.default_branch;
    }
    if (!treeSha) {
      throw createApiServiceError(
        `GitHub repository "${owner}/${repo}" does not expose a default branch.`,
        { reason: 'github_get_repository_tree_default_branch_missing' }
      );
    }

    let response = await this.read(
      `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(treeSha)}`,
      'get repository tree',
      'github_get_repository_tree_failed',
      { params: { recursive: params.recursive ? '1' : undefined } }
    );
    let entries = (Array.isArray(response.data.tree) ? response.data.tree : []).map(
      (entry: any) => ({
        path: entry.path,
        type: entry.type,
        ...(typeof entry.size === 'number' ? { size: entry.size } : {}),
        mode: entry.mode,
        sha: entry.sha,
        url: entry.url
      })
    );
    if (params.pathFilter) {
      entries = entries.filter(
        (entry: any) =>
          typeof entry?.path === 'string' && entry.path.startsWith(params.pathFilter)
      );
    }

    return {
      sha: response.data.sha,
      truncated: Boolean(response.data.truncated),
      tree: entries,
      tree_sha: treeSha,
      owner,
      repo,
      recursive: params.recursive ?? false,
      count: entries.length
    };
  }

  async createRepository(data: {
    name: string;
    description?: string;
    private: boolean;
    autoInit?: boolean;
    organization?: string;
  }) {
    let { organization, autoInit, ...rest } = data;
    let body = {
      ...rest,
      auto_init: autoInit
    };

    let url = organization ? `/orgs/${organization}/repos` : '/user/repos';
    let response = await this.write(
      'post',
      url,
      body,
      'create repository',
      'github_create_repository_failed'
    );
    return response.data;
  }

  async updateRepository(
    owner: string,
    repo: string,
    data: {
      name?: string;
      description?: string;
      homepage?: string;
      private?: boolean;
      hasIssues?: boolean;
      hasProjects?: boolean;
      hasWiki?: boolean;
      defaultBranch?: string;
      archived?: boolean;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    if (data.homepage !== undefined) body.homepage = data.homepage;
    if (data.private !== undefined) body.private = data.private;
    if (data.hasIssues !== undefined) body.has_issues = data.hasIssues;
    if (data.hasProjects !== undefined) body.has_projects = data.hasProjects;
    if (data.hasWiki !== undefined) body.has_wiki = data.hasWiki;
    if (data.defaultBranch !== undefined) body.default_branch = data.defaultBranch;
    if (data.archived !== undefined) body.archived = data.archived;

    let response = await this.http.patch(`/repos/${owner}/${repo}`, body);
    return response.data;
  }

  async deleteRepository(owner: string, repo: string) {
    await this.http.delete(`/repos/${owner}/${repo}`);
  }

  // ─── Issues ────────────────────────────────────────────────────

  async requestGraphQL<T>(
    query: string,
    variables: Record<string, unknown>,
    features: string[] = []
  ): Promise<T> {
    let url =
      this.instanceUrl === 'https://github.com'
        ? `${this.apiBaseUrl}/graphql`
        : `${this.instanceUrl}/api/graphql`;
    let response: {
      data?: {
        errors?: unknown;
        data?: T;
      };
    };
    try {
      response = (await this.http.post(
        url,
        { query, variables },
        {
          headers: features.length > 0 ? { 'GraphQL-Features': features.join(',') } : undefined
        }
      )) as typeof response;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'GitHub',
        operation: 'execute GraphQL request',
        reason: 'github_graphql_request_failed',
        nestedKeys: ['errors']
      });
    }

    let errors = response.data?.errors;
    if (Array.isArray(errors) && errors.length > 0) {
      let details = errors
        .map((error: any) => error?.message)
        .filter((message: unknown): message is string => typeof message === 'string')
        .join(' - ');
      throw createApiServiceError(
        `GitHub GraphQL request failed${details ? `: ${details}` : '.'}`,
        { reason: 'github_graphql_error' }
      );
    }

    return response.data?.data as T;
  }

  private async queryGraphQL<T>(
    query: string,
    variables: Record<string, unknown>,
    features: string[] = []
  ): Promise<T> {
    return await this.requestGraphQL<T>(query, variables, features);
  }

  async listIssues(
    owner: string,
    repo: string,
    params: {
      state?: 'OPEN' | 'CLOSED';
      labels?: string[];
      orderBy?: 'CREATED_AT' | 'UPDATED_AT' | 'COMMENTS';
      direction?: string;
      since?: string;
      perPage?: number;
      after?: string;
      fieldFilters?: { fieldName: string; value: string }[];
    } = {}
  ) {
    let issueFieldValues: Record<string, unknown>[] = [];
    if (params.fieldFilters?.length) {
      let fields = await this.listIssueFields(owner, repo);
      let fieldsByName = new Map(
        fields.map(field => [field.name.toLocaleLowerCase(), field] as const)
      );

      issueFieldValues = params.fieldFilters.map(filter => {
        let field = fieldsByName.get(filter.fieldName.toLocaleLowerCase());
        if (!field) {
          throw createApiServiceError(
            `Unknown GitHub issue field "${filter.fieldName}". Known fields: ${fields
              .map(candidate => candidate.name)
              .join(', ')}.`,
            { reason: 'github_issue_field_filter_unknown' }
          );
        }

        let resolved: Record<string, unknown> = { fieldName: field.name };
        switch (field.dataType) {
          case 'SINGLE_SELECT': {
            let option = field.options.find(
              (candidate: any) =>
                candidate.name.localeCompare(filter.value, undefined, {
                  sensitivity: 'accent'
                }) === 0
            );
            if (!option) {
              throw createApiServiceError(
                `"${filter.value}" is not a valid option for GitHub issue field "${field.name}". Valid options: ${field.options
                  .map((candidate: any) => candidate.name)
                  .join(', ')}.`,
                { reason: 'github_issue_field_filter_invalid_option' }
              );
            }
            resolved.singleSelectOptionValue = option.name;
            break;
          }
          case 'TEXT':
            resolved.textValue = filter.value;
            break;
          case 'DATE': {
            let dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(filter.value);
            let isValidDate = false;
            if (dateMatch) {
              let year = Number(dateMatch[1]);
              let month = Number(dateMatch[2]);
              let day = Number(dateMatch[3]);
              let date = new Date(Date.UTC(year, month - 1, day));
              isValidDate =
                date.getUTCFullYear() === year &&
                date.getUTCMonth() === month - 1 &&
                date.getUTCDate() === day;
            }
            if (!isValidDate) {
              throw createApiServiceError(
                `"${filter.value}" is not a valid date for GitHub issue field "${field.name}". Use YYYY-MM-DD.`,
                { reason: 'github_issue_field_filter_invalid_date' }
              );
            }
            resolved.dateValue = filter.value;
            break;
          }
          case 'NUMBER': {
            let value = Number(filter.value);
            if (!Number.isFinite(value)) {
              throw createApiServiceError(
                `"${filter.value}" is not a valid number for GitHub issue field "${field.name}".`,
                { reason: 'github_issue_field_filter_invalid_number' }
              );
            }
            resolved.numberValue = value;
            break;
          }
          default:
            throw createApiServiceError(
              `GitHub issue field "${field.name}" has unsupported type "${field.dataType}".`,
              { reason: 'github_issue_field_filter_unsupported_type' }
            );
        }
        return resolved;
      });
    }

    let since = params.since;
    if (since && /^\d{4}-\d{2}-\d{2}$/.test(since)) {
      since = `${since}T00:00:00Z`;
    }
    if (since && !Number.isFinite(Date.parse(since))) {
      throw createApiServiceError(
        `"${params.since}" is not a valid ISO 8601 timestamp for GitHub issue filtering.`,
        { reason: 'github_issue_filter_invalid_since' }
      );
    }
    let hasLabels = Boolean(params.labels?.length);
    let hasSince = Boolean(since);

    let data = await this.queryGraphQL<{
      repository: null | {
        issues: {
          totalCount: number;
          pageInfo: {
            hasNextPage: boolean;
            hasPreviousPage: boolean;
            startCursor: string | null;
            endCursor: string | null;
          };
          nodes: {
            number: number;
            title: string;
            state: string;
            url: string;
            author: null | { login: string };
            assignees: { nodes: { login: string }[] };
            labels: { nodes: { name: string }[] };
            comments: { totalCount: number };
            createdAt: string;
            updatedAt: string;
            issueFieldValues: {
              nodes: {
                __typename: string;
                field?: { name: string };
                value?: string | number | null;
              }[];
            };
          }[];
        };
      };
    }>(
      `query ListIssues(
        $owner: String!
        $repo: String!
        $first: Int!
        $after: String
        $states: [IssueState!]
        ${hasLabels ? '$labels: [String!]' : ''}
        $orderBy: IssueOrder!
        ${hasSince ? '$since: DateTime' : ''}
        $issueFieldValues: [IssueFieldValueFilter!]
      ) {
        repository(owner: $owner, name: $repo) {
          issues(
            first: $first
            after: $after
            states: $states
            ${hasLabels ? 'labels: $labels' : ''}
            orderBy: $orderBy
            filterBy: {
              ${hasSince ? 'since: $since' : ''}
              issueFieldValues: $issueFieldValues
            }
          ) {
            totalCount
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            nodes {
              number
              title
              state
              url
              author {
                login
              }
              assignees(first: 100) {
                nodes {
                  login
                }
              }
              labels(first: 100) {
                nodes {
                  name
                }
              }
              comments {
                totalCount
              }
              createdAt
              updatedAt
              issueFieldValues(first: 25) {
                nodes {
                  __typename
                  ... on IssueFieldTextValue {
                    field {
                      ... on IssueFieldText {
                        name
                      }
                    }
                    value
                  }
                  ... on IssueFieldNumberValue {
                    field {
                      ... on IssueFieldNumber {
                        name
                      }
                    }
                    value
                  }
                  ... on IssueFieldDateValue {
                    field {
                      ... on IssueFieldDate {
                        name
                      }
                    }
                    value
                  }
                  ... on IssueFieldSingleSelectValue {
                    field {
                      ... on IssueFieldSingleSelect {
                        name
                      }
                    }
                    value
                  }
                }
              }
            }
          }
        }
      }`,
      {
        owner,
        repo,
        first: params.perPage ?? 30,
        after: params.after ?? null,
        states: params.state ? [params.state] : ['OPEN', 'CLOSED'],
        ...(hasLabels ? { labels: params.labels } : {}),
        orderBy: {
          field: params.orderBy ?? 'CREATED_AT',
          direction: params.direction ?? 'DESC'
        },
        ...(hasSince ? { since } : {}),
        issueFieldValues
      },
      ['issue_fields', 'repo_issue_fields']
    );

    if (!data.repository) {
      throw createApiServiceError(
        `GitHub repository "${owner}/${repo}" was not found or is not accessible.`,
        { reason: 'github_issues_repository_unavailable' }
      );
    }

    return {
      ...data.repository.issues,
      nodes: data.repository.issues.nodes.map(issue => ({
        ...issue,
        fieldValues: issue.issueFieldValues.nodes.flatMap(value =>
          value.field && value.value !== null && value.value !== undefined
            ? [{ field: value.field.name, value: String(value.value) }]
            : []
        )
      }))
    };
  }

  async getIssue(owner: string, repo: string, issueNumber: number) {
    let response = await this.http.get(`/repos/${owner}/${repo}/issues/${issueNumber}`);
    return response.data;
  }

  async getIssueReadEnrichment(owner: string, repo: string, issueNumber: number) {
    let data = await this.queryGraphQL<{
      repository: null | {
        issue: null | {
          parent: null | {
            number: number;
            title: string;
            state: string;
            url: string;
            repository: { nameWithOwner: string };
          };
          subIssues: { totalCount: number };
          subIssuesSummary: null | {
            total: number;
            completed: number;
            percentCompleted: number;
          };
          issueFieldValues: {
            nodes: {
              __typename: string;
              field?: { name: string };
              value?: string | number | null;
            }[];
          };
        };
      };
    }>(
      `query GetIssueReadEnrichment($owner: String!, $repo: String!, $issueNumber: Int!) {
        repository(owner: $owner, name: $repo) {
          issue(number: $issueNumber) {
            parent {
              number
              title
              state
              url
              repository {
                nameWithOwner
              }
            }
            subIssues(first: 1) {
              totalCount
            }
            subIssuesSummary {
              total
              completed
              percentCompleted
            }
            issueFieldValues(first: 25) {
              nodes {
                __typename
                ... on IssueFieldTextValue {
                  field {
                    ... on IssueFieldText {
                      name
                    }
                  }
                  value
                }
                ... on IssueFieldNumberValue {
                  field {
                    ... on IssueFieldNumber {
                      name
                    }
                  }
                  value
                }
                ... on IssueFieldDateValue {
                  field {
                    ... on IssueFieldDate {
                      name
                    }
                  }
                  value
                }
                ... on IssueFieldSingleSelectValue {
                  field {
                    ... on IssueFieldSingleSelect {
                      name
                    }
                  }
                  value
                }
              }
            }
          }
        }
      }`,
      { owner, repo, issueNumber },
      ['issue_fields', 'repo_issue_fields']
    );

    let issue = data.repository?.issue;
    if (!issue) return null;

    return {
      hasParent: issue.parent !== null,
      hasChildren: issue.subIssues.totalCount > 0,
      parent: issue.parent,
      subIssuesSummary: issue.subIssuesSummary,
      fieldValues: issue.issueFieldValues.nodes.flatMap(value =>
        value.field && value.value !== null && value.value !== undefined
          ? [{ field: value.field.name, value: String(value.value) }]
          : []
      )
    };
  }

  async createIssue(
    owner: string,
    repo: string,
    data: {
      title: string;
      body?: string;
      assignees?: string[];
      labels?: string[];
      milestone?: number;
    }
  ) {
    let response = await this.http.post(`/repos/${owner}/${repo}/issues`, data);
    return response.data;
  }

  async updateIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    data: {
      title?: string;
      body?: string;
      state?: string;
      stateReason?: string;
      assignees?: string[];
      labels?: string[];
      milestone?: number | null;
    }
  ) {
    let body: Record<string, any> = { ...data };
    if (data.stateReason !== undefined) {
      body.state_reason = data.stateReason;
      body.stateReason = undefined;
    }
    let response = await this.http.patch(
      `/repos/${owner}/${repo}/issues/${issueNumber}`,
      body
    );
    return response.data;
  }

  async createIssueComment(owner: string, repo: string, issueNumber: number, body: string) {
    let response = await this.http.post(
      `/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      { body }
    );
    return response.data;
  }

  async listIssueComments(
    owner: string,
    repo: string,
    issueNumber: number,
    params: {
      perPage?: number;
      page?: number;
      since?: string;
    } = {}
  ) {
    let response = await this.http.get(
      `/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      {
        params: { per_page: params.perPage, page: params.page, since: params.since }
      }
    );
    return response.data;
  }

  async listSubIssues(
    owner: string,
    repo: string,
    issueNumber: number,
    params: { perPage?: number; page?: number } = {}
  ) {
    let response = await this.http.get(
      `/repos/${owner}/${repo}/issues/${issueNumber}/sub_issues`,
      {
        params: { per_page: params.perPage, page: params.page },
        headers: { 'X-GitHub-Api-Version': '2026-03-10' }
      }
    );
    return response.data;
  }

  async addSubIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    subIssueId: number,
    replaceParent?: boolean
  ) {
    let response = await this.write(
      'post',
      `/repos/${owner}/${repo}/issues/${issueNumber}/sub_issues`,
      {
        sub_issue_id: subIssueId,
        ...(replaceParent === undefined ? {} : { replace_parent: replaceParent })
      },
      'add sub-issue',
      'github_add_sub_issue_failed'
    );
    return response.data;
  }

  async removeSubIssue(owner: string, repo: string, issueNumber: number, subIssueId: number) {
    let response = await this.write(
      'delete',
      `/repos/${owner}/${repo}/issues/${issueNumber}/sub_issue`,
      { sub_issue_id: subIssueId },
      'remove sub-issue',
      'github_remove_sub_issue_failed'
    );
    return response.data;
  }

  async reprioritizeSubIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    subIssueId: number,
    position: { afterId?: number; beforeId?: number }
  ) {
    let response = await this.write(
      'patch',
      `/repos/${owner}/${repo}/issues/${issueNumber}/sub_issues/priority`,
      {
        sub_issue_id: subIssueId,
        ...(position.afterId === undefined ? {} : { after_id: position.afterId }),
        ...(position.beforeId === undefined ? {} : { before_id: position.beforeId })
      },
      'reprioritize sub-issue',
      'github_reprioritize_sub_issue_failed'
    );
    return response.data;
  }

  async getIssueParent(owner: string, repo: string, issueNumber: number) {
    let data = await this.queryGraphQL<{
      repository: {
        issue: {
          parent: null | {
            number: number;
            title: string;
            state: string;
            url: string;
            repository: { nameWithOwner: string };
          };
        };
      };
    }>(
      `query GetIssueParent($owner: String!, $repo: String!, $issueNumber: Int!) {
        repository(owner: $owner, name: $repo) {
          issue(number: $issueNumber) {
            parent {
              number
              title
              state
              url
              repository {
                nameWithOwner
              }
            }
          }
        }
      }`,
      { owner, repo, issueNumber }
    );

    return data.repository.issue.parent;
  }

  async listIssueLabels(owner: string, repo: string, issueNumber: number) {
    let response = await this.http.get(
      `/repos/${owner}/${repo}/issues/${issueNumber}/labels`,
      { params: { per_page: 100 } }
    );
    return response.data;
  }

  async listIssueFields(owner: string, repo?: string) {
    let fieldFragments = `
      __typename
      ... on IssueFieldText {
        id
        fullDatabaseId
        name
        description
        dataType
        visibility
      }
      ... on IssueFieldNumber {
        id
        fullDatabaseId
        name
        description
        dataType
        visibility
      }
      ... on IssueFieldDate {
        id
        fullDatabaseId
        name
        description
        dataType
        visibility
      }
      ... on IssueFieldSingleSelect {
        id
        fullDatabaseId
        name
        description
        dataType
        visibility
        options {
          id
          name
          description
          color
          priority
        }
      }
    `;

    let nodes: any[];
    if (repo) {
      let data = await this.queryGraphQL<{
        repository: null | { issueFields: { nodes: any[] } };
      }>(
        `query ListRepositoryIssueFields($owner: String!, $repo: String!) {
          repository(owner: $owner, name: $repo) {
            issueFields(first: 100) {
              nodes {
                ${fieldFragments}
              }
            }
          }
        }`,
        { owner, repo },
        ['issue_fields', 'repo_issue_fields']
      );
      if (!data.repository) {
        throw createApiServiceError(
          `GitHub repository "${owner}/${repo}" was not found or does not expose issue fields.`,
          { reason: 'github_issue_fields_repository_unavailable' }
        );
      }
      nodes = data.repository.issueFields.nodes;
    } else {
      let data = await this.queryGraphQL<{
        organization: null | { issueFields: { nodes: any[] } };
      }>(
        `query ListOrganizationIssueFields($owner: String!) {
          organization(login: $owner) {
            issueFields(first: 100) {
              nodes {
                ${fieldFragments}
              }
            }
          }
        }`,
        { owner },
        ['issue_fields', 'repo_issue_fields']
      );
      if (!data.organization) {
        throw createApiServiceError(
          `GitHub organization "${owner}" was not found or does not expose issue fields.`,
          { reason: 'github_issue_fields_organization_unavailable' }
        );
      }
      nodes = data.organization.issueFields.nodes;
    }

    return nodes.map(node => ({
      id: String(node.id),
      fullDatabaseId:
        node.fullDatabaseId === undefined || node.fullDatabaseId === null
          ? undefined
          : Number(node.fullDatabaseId),
      name: node.name,
      description: node.description || null,
      dataType: node.dataType,
      visibility: node.visibility,
      options: (node.options ?? []).map((option: any) => ({
        id: String(option.id),
        name: option.name,
        description: option.description || null,
        color: option.color,
        priority: option.priority ?? null
      }))
    }));
  }

  async listIssueTypes(owner: string, repo?: string) {
    let path = repo ? `/repos/${owner}/${repo}/issue-types` : `/orgs/${owner}/issue-types`;
    let response = await this.http.get(path, {
      headers: { 'X-GitHub-Api-Version': '2026-03-10' }
    });
    return response.data;
  }

  // ─── Pull Requests ─────────────────────────────────────────────

  async listPullRequests(
    owner: string,
    repo: string,
    params: {
      state?: string;
      head?: string;
      base?: string;
      sort?: string;
      direction?: string;
      perPage?: number;
      page?: number;
    } = {}
  ) {
    let response = await this.read(
      `/repos/${owner}/${repo}/pulls`,
      'list pull requests',
      'github_list_pull_requests_failed',
      {
        params: {
          state: params.state,
          head: params.head,
          base: params.base,
          sort: params.sort,
          direction: params.direction,
          per_page: params.perPage,
          page: params.page
        }
      }
    );
    return response.data;
  }

  async getPullRequest(owner: string, repo: string, pullNumber: number) {
    let response = await this.http.get(`/repos/${owner}/${repo}/pulls/${pullNumber}`);
    return response.data;
  }

  async getPullRequestDiff(owner: string, repo: string, pullNumber: number) {
    let response = await this.http.get(`/repos/${owner}/${repo}/pulls/${pullNumber}`, {
      headers: { Accept: 'application/vnd.github.diff' },
      responseType: 'text'
    });
    return response.data as string;
  }

  async listPullRequestFiles(
    owner: string,
    repo: string,
    pullNumber: number,
    params: { perPage?: number; page?: number } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/pulls/${pullNumber}/files`, {
      params: { per_page: params.perPage, page: params.page }
    });
    return response.data;
  }

  async listPullRequestCommits(
    owner: string,
    repo: string,
    pullNumber: number,
    params: { perPage?: number; page?: number } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/pulls/${pullNumber}/commits`, {
      params: { per_page: params.perPage, page: params.page }
    });
    return response.data;
  }

  async createPullRequest(
    owner: string,
    repo: string,
    data: {
      title: string;
      head: string;
      base: string;
      body?: string;
      draft?: boolean;
      maintainerCanModify?: boolean;
    }
  ) {
    let body: Record<string, any> = {
      title: data.title,
      head: data.head,
      base: data.base,
      body: data.body,
      draft: data.draft,
      maintainer_can_modify: data.maintainerCanModify
    };
    let response = await this.http.post(`/repos/${owner}/${repo}/pulls`, body);
    return response.data;
  }

  async updatePullRequest(
    owner: string,
    repo: string,
    pullNumber: number,
    data: {
      title?: string;
      body?: string;
      state?: string;
      base?: string;
      maintainerCanModify?: boolean;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.title !== undefined) body.title = data.title;
    if (data.body !== undefined) body.body = data.body;
    if (data.state !== undefined) body.state = data.state;
    if (data.base !== undefined) body.base = data.base;
    if (data.maintainerCanModify !== undefined)
      body.maintainer_can_modify = data.maintainerCanModify;

    let response = await this.http.patch(`/repos/${owner}/${repo}/pulls/${pullNumber}`, body);
    return response.data;
  }

  async mergePullRequest(
    owner: string,
    repo: string,
    pullNumber: number,
    data: {
      commitTitle?: string;
      commitMessage?: string;
      mergeMethod?: string;
    } = {}
  ) {
    let body: Record<string, any> = {};
    if (data.commitTitle) body.commit_title = data.commitTitle;
    if (data.commitMessage) body.commit_message = data.commitMessage;
    if (data.mergeMethod) body.merge_method = data.mergeMethod;

    let response = await this.write(
      'put',
      `/repos/${owner}/${repo}/pulls/${pullNumber}/merge`,
      body,
      'merge pull request',
      'github_merge_pull_request_failed'
    );
    return response.data;
  }

  async updatePullRequestBranch(
    owner: string,
    repo: string,
    pullNumber: number,
    expectedHeadSha?: string
  ) {
    let response = await this.write(
      'put',
      `/repos/${owner}/${repo}/pulls/${pullNumber}/update-branch`,
      expectedHeadSha ? { expected_head_sha: expectedHeadSha } : {},
      'update pull request branch',
      'github_update_pull_request_branch_failed'
    );
    return response.data;
  }

  async listPullRequestReviews(
    owner: string,
    repo: string,
    pullNumber: number,
    params: { perPage?: number; page?: number } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`, {
      params: { per_page: params.perPage, page: params.page }
    });
    return response.data;
  }

  async listPullRequestReviewThreads(
    owner: string,
    repo: string,
    pullNumber: number,
    params: { perPage?: number; after?: string } = {}
  ) {
    let data = await this.queryGraphQL<{
      repository: {
        pullRequest: {
          reviewThreads: {
            nodes: Array<{
              id: string;
              isResolved: boolean;
              isOutdated: boolean;
              isCollapsed: boolean;
              comments: {
                totalCount: number;
                nodes: Array<{
                  id: string;
                  body: string;
                  path: string;
                  line: number | null;
                  author: { login: string } | null;
                  createdAt: string;
                  updatedAt: string;
                  url: string;
                }>;
              };
            }>;
            totalCount: number;
            pageInfo: {
              hasNextPage: boolean;
              hasPreviousPage: boolean;
              startCursor: string | null;
              endCursor: string | null;
            };
          };
        };
      };
    }>(
      `query ListPullRequestReviewThreads(
        $owner: String!
        $repo: String!
        $pullNumber: Int!
        $first: Int!
        $after: String
      ) {
        repository(owner: $owner, name: $repo) {
          pullRequest(number: $pullNumber) {
            reviewThreads(first: $first, after: $after) {
              totalCount
              pageInfo {
                hasNextPage
                hasPreviousPage
                startCursor
                endCursor
              }
              nodes {
                id
                isResolved
                isOutdated
                isCollapsed
                comments(first: 100) {
                  totalCount
                  nodes {
                    id
                    body
                    path
                    line
                    author {
                      login
                    }
                    createdAt
                    updatedAt
                    url
                  }
                }
              }
            }
          }
        }
      }`,
      {
        owner,
        repo,
        pullNumber,
        first: params.perPage ?? 30,
        after: params.after ?? null
      }
    );

    return data.repository.pullRequest.reviewThreads;
  }

  async createPullRequestReview(
    owner: string,
    repo: string,
    pullNumber: number,
    data: {
      body?: string;
      event: string;
      comments?: Array<{ path: string; position?: number; body: string }>;
    }
  ) {
    let response = await this.http.post(
      `/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`,
      data
    );
    return response.data;
  }

  async requestReviewers(
    owner: string,
    repo: string,
    pullNumber: number,
    data: {
      reviewers?: string[];
      teamReviewers?: string[];
    }
  ) {
    let body: Record<string, any> = {};
    if (data.reviewers) body.reviewers = data.reviewers;
    if (data.teamReviewers) body.team_reviewers = data.teamReviewers;

    let response = await this.http.post(
      `/repos/${owner}/${repo}/pulls/${pullNumber}/requested_reviewers`,
      body
    );
    return response.data;
  }

  // ─── Branches ──────────────────────────────────────────────────

  async listBranches(
    owner: string,
    repo: string,
    params: {
      perPage?: number;
      page?: number;
    } = {}
  ) {
    let response = await this.read(
      `/repos/${owner}/${repo}/branches`,
      'list repository branches',
      'github_list_branches_failed',
      { params: { per_page: params.perPage, page: params.page } }
    );
    return response.data;
  }

  async getBranch(owner: string, repo: string, branch: string) {
    let response = await this.http.get(
      `/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`
    );
    return response.data;
  }

  async createBranch(owner: string, repo: string, branch: string, fromBranch?: string) {
    let sourceBranch = fromBranch;
    if (!sourceBranch) {
      let repository = await this.read(
        `/repos/${owner}/${repo}`,
        'get source repository',
        'github_create_branch_repository_failed'
      );
      sourceBranch = repository.data.default_branch;
    }
    if (!sourceBranch) {
      throw createApiServiceError(
        `GitHub repository "${owner}/${repo}" does not expose a default branch.`,
        { reason: 'github_create_branch_default_branch_missing' }
      );
    }

    let sourceRef = await this.read(
      `/repos/${owner}/${repo}/git/ref/heads/${this.encodePath(sourceBranch)}`,
      'get source branch reference',
      'github_create_branch_source_failed'
    );
    let response = await this.write(
      'post',
      `/repos/${owner}/${repo}/git/refs`,
      {
        ref: `refs/heads/${branch}`,
        sha: sourceRef.data.object.sha
      },
      'create branch',
      'github_create_branch_failed'
    );
    return response.data;
  }

  async pushFiles(
    owner: string,
    repo: string,
    branch: string,
    files: Array<{ path: string; content: string }>,
    message: string
  ) {
    let ref: any;
    let repositoryIsEmpty = false;

    try {
      let response = await this.http.get(
        `/repos/${owner}/${repo}/git/ref/heads/${this.encodePath(branch)}`
      );
      ref = response.data;
    } catch (error: any) {
      let status = error?.response?.status;
      let errorMessage = error?.response?.data?.message;
      repositoryIsEmpty = status === 409 && errorMessage === 'Git Repository is empty.';

      if (!repositoryIsEmpty && status !== 404) {
        throw buildApiServiceError(error, {
          providerLabel: 'GitHub',
          operation: 'get target branch reference',
          reason: 'github_push_files_branch_failed',
          nestedKeys: ['errors']
        });
      }
    }

    if (repositoryIsEmpty) {
      let repository = await this.read(
        `/repos/${owner}/${repo}`,
        'get empty repository information',
        'github_push_files_repository_failed'
      );
      let defaultBranch = repository.data.default_branch;
      let initial = await this.write(
        'put',
        `/repos/${owner}/${repo}/contents/README.md`,
        {
          message: 'Initial commit',
          content: '',
          branch: defaultBranch
        },
        'initialize empty repository',
        'github_push_files_initialize_failed'
      );
      let defaultRef = await this.read(
        `/repos/${owner}/${repo}/git/ref/heads/${this.encodePath(defaultBranch)}`,
        'get initialized branch reference',
        'github_push_files_initialized_ref_failed'
      );
      ref = defaultRef.data;

      if (!ref?.object?.sha && initial.data?.commit?.sha) {
        ref = {
          ref: `refs/heads/${defaultBranch}`,
          object: { sha: initial.data.commit.sha }
        };
      }
      if (branch !== defaultBranch) {
        let branchResponse = await this.write(
          'post',
          `/repos/${owner}/${repo}/git/refs`,
          {
            ref: `refs/heads/${branch}`,
            sha: ref.object.sha
          },
          'create target branch',
          'github_push_files_create_branch_failed'
        );
        ref = branchResponse.data;
      }
    } else if (!ref) {
      ref = await this.createBranch(owner, repo, branch);
    }

    let baseCommit = await this.read(
      `/repos/${owner}/${repo}/git/commits/${encodeURIComponent(ref.object.sha)}`,
      'get base commit',
      'github_push_files_base_commit_failed'
    );
    let tree = await this.write(
      'post',
      `/repos/${owner}/${repo}/git/trees`,
      {
        base_tree: baseCommit.data.tree.sha,
        tree: files.map(file => ({
          path: file.path,
          mode: '100644',
          type: 'blob',
          content: file.content
        }))
      },
      'create file tree',
      'github_push_files_tree_failed'
    );
    let commit = await this.write(
      'post',
      `/repos/${owner}/${repo}/git/commits`,
      {
        message,
        tree: tree.data.sha,
        parents: [baseCommit.data.sha]
      },
      'create file commit',
      'github_push_files_commit_failed'
    );
    let updatedRef = await this.write(
      'patch',
      `/repos/${owner}/${repo}/git/refs/heads/${this.encodePath(branch)}`,
      {
        sha: commit.data.sha,
        force: false
      },
      'update branch reference',
      'github_push_files_update_ref_failed'
    );

    return {
      ref: updatedRef.data,
      commit: commit.data,
      tree: tree.data
    };
  }

  // ─── Contents ──────────────────────────────────────────────────

  async getContent(owner: string, repo: string, path: string, ref?: string) {
    let normalizedPath = path.replace(/^\/+/, '');
    let suffix = normalizedPath ? `/contents/${this.encodePath(normalizedPath)}` : '/contents';
    let response = await this.read(
      `/repos/${owner}/${repo}${suffix}`,
      'get repository content',
      'github_get_file_contents_failed',
      { params: ref ? { ref } : undefined }
    );
    return response.data;
  }

  async createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    data: {
      message: string;
      content: string;
      sha?: string;
      branch?: string;
    }
  ) {
    let response = await this.http.put(
      `/repos/${owner}/${repo}/contents/${this.encodePath(path)}`,
      data
    );
    return response.data;
  }

  async deleteFile(
    owner: string,
    repo: string,
    path: string,
    data: {
      message: string;
      sha: string;
      branch?: string;
    }
  ) {
    let response = await this.http.delete(
      `/repos/${owner}/${repo}/contents/${this.encodePath(path)}`,
      {
        data
      }
    );
    return response.data;
  }

  // ─── Labels ────────────────────────────────────────────────────

  async listLabels(
    owner: string,
    repo: string,
    params: { perPage?: number; page?: number } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/labels`, {
      params: { per_page: params.perPage, page: params.page }
    });
    return response.data;
  }

  async getLabel(owner: string, repo: string, name: string) {
    let response = await this.http.get(
      `/repos/${owner}/${repo}/labels/${encodeURIComponent(name)}`
    );
    return response.data;
  }

  async createLabel(
    owner: string,
    repo: string,
    data: { name: string; color?: string; description?: string }
  ) {
    let response = await this.http.post(`/repos/${owner}/${repo}/labels`, data);
    return response.data;
  }

  // ─── Milestones ────────────────────────────────────────────────

  async listMilestones(
    owner: string,
    repo: string,
    params: {
      state?: string;
      sort?: string;
      direction?: string;
      perPage?: number;
      page?: number;
    } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/milestones`, {
      params: { ...params, per_page: params.perPage }
    });
    return response.data;
  }

  // ─── Workflows / Actions ───────────────────────────────────────

  async listWorkflows(
    owner: string,
    repo: string,
    params: { perPage?: number; page?: number } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/actions/workflows`, {
      params: { per_page: params.perPage, page: params.page }
    });
    return response.data;
  }

  async listWorkflowRuns(
    owner: string,
    repo: string,
    params: {
      workflowId?: number | string;
      branch?: string;
      event?: string;
      status?: string;
      perPage?: number;
      page?: number;
    } = {}
  ) {
    let url = params.workflowId
      ? `/repos/${owner}/${repo}/actions/workflows/${params.workflowId}/runs`
      : `/repos/${owner}/${repo}/actions/runs`;

    let { workflowId, ...queryParams } = params;
    let response = await this.http.get(url, {
      params: { ...queryParams, per_page: queryParams.perPage }
    });
    return response.data;
  }

  async getWorkflowRun(owner: string, repo: string, runId: number) {
    let response = await this.http.get(`/repos/${owner}/${repo}/actions/runs/${runId}`);
    return response.data;
  }

  async triggerWorkflowDispatch(
    owner: string,
    repo: string,
    workflowId: number | string,
    data: {
      ref: string;
      inputs?: Record<string, string>;
    }
  ) {
    await this.http.post(
      `/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
      data
    );
  }

  async cancelWorkflowRun(owner: string, repo: string, runId: number) {
    await this.http.post(`/repos/${owner}/${repo}/actions/runs/${runId}/cancel`);
  }

  async rerunWorkflow(owner: string, repo: string, runId: number) {
    await this.http.post(`/repos/${owner}/${repo}/actions/runs/${runId}/rerun`);
  }

  async listWorkflowRunJobs(
    owner: string,
    repo: string,
    runId: number,
    params: {
      filter?: string;
      perPage?: number;
      page?: number;
    } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/actions/runs/${runId}/jobs`, {
      params: { ...params, per_page: params.perPage }
    });
    return response.data;
  }

  // ─── Releases ──────────────────────────────────────────────────

  async listReleases(
    owner: string,
    repo: string,
    params: { perPage?: number; page?: number } = {}
  ) {
    let response = await this.read(
      `/repos/${owner}/${repo}/releases`,
      'list repository releases',
      'github_list_releases_failed',
      { params: { per_page: params.perPage, page: params.page } }
    );
    return response.data;
  }

  async getRelease(owner: string, repo: string, releaseId: number) {
    let response = await this.http.get(`/repos/${owner}/${repo}/releases/${releaseId}`);
    return response.data;
  }

  async getLatestRelease(owner: string, repo: string) {
    let response = await this.read(
      `/repos/${owner}/${repo}/releases/latest`,
      'get the latest repository release',
      'github_get_latest_release_failed'
    );
    return response.data;
  }

  async getReleaseByTag(owner: string, repo: string, tag: string) {
    let response = await this.read(
      `/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(tag)}`,
      'get a repository release by tag',
      'github_get_release_by_tag_failed'
    );
    return response.data;
  }

  async createRelease(
    owner: string,
    repo: string,
    data: {
      tagName: string;
      targetCommitish?: string;
      name?: string;
      body?: string;
      draft?: boolean;
      prerelease?: boolean;
      generateReleaseNotes?: boolean;
    }
  ) {
    let body: Record<string, any> = {
      tag_name: data.tagName,
      name: data.name,
      body: data.body,
      draft: data.draft,
      prerelease: data.prerelease,
      generate_release_notes: data.generateReleaseNotes
    };
    if (data.targetCommitish) body.target_commitish = data.targetCommitish;

    let response = await this.http.post(`/repos/${owner}/${repo}/releases`, body);
    return response.data;
  }

  // ─── Search ────────────────────────────────────────────────────

  async searchRepositories(
    query: string,
    params: {
      sort?: string;
      order?: string;
      perPage?: number;
      page?: number;
    } = {}
  ) {
    let response = await this.http.get('/search/repositories', {
      params: { q: query, ...params, per_page: params.perPage }
    });
    return response.data;
  }

  async searchCode(
    query: string,
    params: {
      sort?: string;
      order?: string;
      perPage?: number;
      page?: number;
    } = {}
  ) {
    let response = await this.http.get('/search/code', {
      params: { q: query, ...params, per_page: params.perPage }
    });
    return response.data;
  }

  async searchIssues(
    query: string,
    params: {
      sort?: string;
      order?: string;
      perPage?: number;
      page?: number;
    } = {}
  ) {
    let response = await this.http.get('/search/issues', {
      params: { q: query, ...params, per_page: params.perPage }
    });
    return response.data;
  }

  async searchUsers(
    query: string,
    params: {
      sort?: string;
      order?: string;
      perPage?: number;
      page?: number;
    } = {}
  ) {
    let response = await this.http.get('/search/users', {
      params: { q: query, ...params, per_page: params.perPage }
    });
    return response.data;
  }

  async searchCommits(
    query: string,
    params: {
      sort?: string;
      order?: string;
      perPage?: number;
      page?: number;
    } = {}
  ) {
    let response = await this.read(
      '/search/commits',
      'search commits',
      'github_search_commits_failed',
      {
        params: {
          q: query,
          sort: params.sort,
          order: params.order,
          per_page: params.perPage,
          page: params.page
        }
      }
    );
    return response.data;
  }

  // ─── Users ─────────────────────────────────────────────────────

  async getAuthenticatedUser() {
    let response = await this.http.get('/user');
    return response.data;
  }

  async getUser(username: string) {
    let response = await this.http.get(`/users/${username}`);
    return response.data;
  }

  // ─── Organizations ────────────────────────────────────────────

  async listUserOrgs(params: { perPage?: number; page?: number } = {}) {
    let response = await this.http.get('/user/orgs', {
      params: { per_page: params.perPage, page: params.page }
    });
    return response.data;
  }

  async getOrg(org: string) {
    let response = await this.http.get(`/orgs/${org}`);
    return response.data;
  }

  async listOrgMembers(
    org: string,
    params: { role?: string; perPage?: number; page?: number } = {}
  ) {
    let response = await this.http.get(`/orgs/${org}/members`, {
      params: { ...params, per_page: params.perPage }
    });
    return response.data;
  }

  async listOrgRepos(
    org: string,
    params: {
      type?: string;
      sort?: string;
      direction?: string;
      perPage?: number;
      page?: number;
    } = {}
  ) {
    let response = await this.http.get(`/orgs/${org}/repos`, {
      params: { ...params, per_page: params.perPage }
    });
    return response.data;
  }

  // ─── Teams ─────────────────────────────────────────────────────

  async listOrgTeams(org: string, params: { perPage?: number; page?: number } = {}) {
    let response = await this.http.get(`/orgs/${org}/teams`, {
      params: { per_page: params.perPage, page: params.page }
    });
    return response.data;
  }

  async getTeams(user?: string) {
    let username =
      user ||
      (
        (await this.getAuthenticatedUser()) as {
          login: string;
        }
      ).login;
    let data = await this.queryGraphQL<{
      user: null | {
        login: string;
        organizations: {
          totalCount: number;
          pageInfo: {
            hasNextPage: boolean;
            endCursor: string | null;
          };
          nodes: Array<{
            id: string;
            databaseId: number | null;
            login: string;
            url: string;
            teams: {
              totalCount: number;
              pageInfo: {
                hasNextPage: boolean;
                endCursor: string | null;
              };
              nodes: Array<{
                id: string;
                databaseId: number | null;
                name: string;
                slug: string;
                description: string | null;
                url: string;
              }>;
            };
          }>;
        };
      };
    }>(
      `query GetTeams($login: String!) {
        user(login: $login) {
          login
          organizations(first: 100) {
            totalCount
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              databaseId
              login
              url
              teams(first: 100, userLogins: [$login]) {
                totalCount
                pageInfo {
                  hasNextPage
                  endCursor
                }
                nodes {
                  id
                  databaseId
                  name
                  slug
                  description
                  url
                }
              }
            }
          }
        }
      }`,
      { login: username }
    );

    return {
      user: data.user?.login ?? username,
      organizations: data.user?.organizations ?? {
        totalCount: 0,
        pageInfo: { hasNextPage: false, endCursor: null },
        nodes: []
      }
    };
  }

  async getTeamMembers(org: string, teamSlug: string) {
    let data = await this.queryGraphQL<{
      organization: null | {
        team: null | {
          id: string;
          databaseId: number | null;
          name: string;
          slug: string;
          url: string;
          members: {
            totalCount: number;
            pageInfo: {
              hasNextPage: boolean;
              endCursor: string | null;
            };
            nodes: Array<{
              id: string;
              databaseId: number | null;
              login: string;
              url: string;
              avatarUrl: string;
            }>;
          };
        };
      };
    }>(
      `query GetTeamMembers($org: String!, $teamSlug: String!) {
        organization(login: $org) {
          team(slug: $teamSlug) {
            id
            databaseId
            name
            slug
            url
            members(first: 100) {
              totalCount
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                databaseId
                login
                url
                avatarUrl
              }
            }
          }
        }
      }`,
      { org, teamSlug }
    );

    return data.organization?.team ?? null;
  }

  // ─── Security advisories ───────────────────────────────────────

  async getGlobalSecurityAdvisory(ghsaId: string) {
    let response = await this.read(
      `/advisories/${encodeURIComponent(ghsaId)}`,
      'get global security advisory',
      'github_get_global_security_advisory_failed'
    );
    return response.data;
  }

  async listGlobalSecurityAdvisories(
    params: {
      ghsaId?: string;
      type?: 'reviewed' | 'malware' | 'unreviewed';
      cveId?: string;
      ecosystem?: string;
      severity?: string;
      cwes?: string[];
      isWithdrawn?: boolean;
      affects?: string;
      published?: string;
      updated?: string;
      modified?: string;
    } = {}
  ) {
    let response = await this.read(
      '/advisories',
      'list global security advisories',
      'github_list_global_security_advisories_failed',
      {
        params: {
          ghsa_id: params.ghsaId,
          type: params.type,
          cve_id: params.cveId,
          ecosystem: params.ecosystem,
          severity: params.severity,
          cwes: params.cwes?.join(','),
          is_withdrawn: params.isWithdrawn,
          affects: params.affects,
          published: params.published,
          updated: params.updated,
          modified: params.modified
        }
      }
    );
    return response.data;
  }

  // ─── Secret scanning ───────────────────────────────────────────

  private parseMcpResponse(data: unknown) {
    if (typeof data !== 'string') return data as any;

    let messages = data
      .split(/\r?\n/)
      .filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).trim())
      .filter(Boolean);
    let candidate = messages.at(-1) ?? data;

    try {
      return JSON.parse(candidate) as any;
    } catch (error) {
      throw createApiServiceError('GitHub secret scanning returned an unreadable response.', {
        reason: 'github_secret_scanning_invalid_response',
        parent: error
      });
    }
  }

  async runSecretScanning(owner: string, repo: string, files: string | string[]) {
    if (this.instanceUrl !== 'https://github.com') {
      throw createApiServiceError(
        'GitHub secret scanning through the remote service is not available for GitHub Enterprise Server connections.',
        { reason: 'github_secret_scanning_enterprise_unsupported' }
      );
    }

    let endpoint = 'https://api.githubcopilot.com/mcp/';
    let commonHeaders: Record<string, string> = {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      'X-MCP-Toolsets': 'secret_protection',
      'X-MCP-Tools': 'run_secret_scanning'
    };

    try {
      let initializeResponse = await this.mcpHttp.post(
        endpoint,
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-06-18',
            capabilities: {},
            clientInfo: {
              name: 'github-integration',
              version: '1.0.0'
            }
          }
        },
        { headers: commonHeaders, timeout: 120_000 }
      );
      let initializeMessage = this.parseMcpResponse(initializeResponse.data);
      if (initializeMessage?.error) {
        throw createApiServiceError(
          `GitHub secret scanning initialization failed: ${initializeMessage.error.message ?? 'Unknown error'}`,
          { reason: 'github_secret_scanning_initialization_failed' }
        );
      }

      let protocolVersion = initializeMessage?.result?.protocolVersion ?? '2025-06-18';
      let sessionId = getResponseHeaderValue(initializeResponse.headers, 'mcp-session-id');
      let sessionHeaders = {
        ...commonHeaders,
        'MCP-Protocol-Version': protocolVersion,
        ...(sessionId ? { 'Mcp-Session-Id': sessionId } : {})
      };

      await this.mcpHttp.post(
        endpoint,
        {
          jsonrpc: '2.0',
          method: 'notifications/initialized'
        },
        { headers: sessionHeaders, timeout: 120_000 }
      );

      let callResponse = await this.mcpHttp.post(
        endpoint,
        {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'run_secret_scanning',
            arguments: { owner, repo, files }
          }
        },
        { headers: sessionHeaders, timeout: 120_000 }
      );
      let callMessage = this.parseMcpResponse(callResponse.data);
      if (callMessage?.error) {
        throw createApiServiceError(
          `GitHub secret scanning failed: ${callMessage.error.message ?? 'Unknown error'}`,
          { reason: 'github_secret_scanning_failed' }
        );
      }

      let result = callMessage?.result;
      let text = Array.isArray(result?.content)
        ? result.content
            .filter((item: any) => item?.type === 'text' && typeof item.text === 'string')
            .map((item: any) => item.text)
            .join('\n')
        : '';

      if (result?.isError) {
        throw createApiServiceError(
          `GitHub secret scanning failed${text ? `: ${text}` : '.'}`,
          { reason: 'github_secret_scanning_failed' }
        );
      }
      if (text) return text;
      if (result?.structuredContent !== undefined) {
        return JSON.stringify(result.structuredContent);
      }

      throw createApiServiceError('GitHub secret scanning returned no readable scan result.', {
        reason: 'github_secret_scanning_empty_response'
      });
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'GitHub',
        operation: 'run secret scanning',
        reason: 'github_secret_scanning_failed',
        nestedKeys: ['errors']
      });
    }
  }

  // ─── Commits ───────────────────────────────────────────────────

  async listCommits(
    owner: string,
    repo: string,
    params: {
      sha?: string;
      path?: string;
      author?: string;
      since?: string;
      until?: string;
      perPage?: number;
      page?: number;
    } = {}
  ) {
    let response = await this.read(
      `/repos/${owner}/${repo}/commits`,
      'list repository commits',
      'github_list_commits_failed',
      {
        params: {
          sha: params.sha,
          path: params.path,
          author: params.author,
          since: params.since,
          until: params.until,
          per_page: params.perPage,
          page: params.page
        }
      }
    );
    return response.data;
  }

  async getCommit(
    owner: string,
    repo: string,
    ref: string,
    params: { perPage?: number; page?: number } = {}
  ) {
    let response = await this.read(
      `/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}`,
      'get repository commit',
      'github_get_commit_failed',
      { params: { per_page: params.perPage, page: params.page } }
    );
    return response.data;
  }

  // ─── Collaborators ────────────────────────────────────────────

  async listCollaborators(
    owner: string,
    repo: string,
    params: { perPage?: number; page?: number } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/collaborators`, {
      params: { per_page: params.perPage, page: params.page }
    });
    return response.data;
  }

  async addCollaborator(owner: string, repo: string, username: string, permission?: string) {
    let response = await this.http.put(`/repos/${owner}/${repo}/collaborators/${username}`, {
      permission
    });
    return response.data;
  }

  async removeCollaborator(owner: string, repo: string, username: string) {
    await this.http.delete(`/repos/${owner}/${repo}/collaborators/${username}`);
  }

  // ─── Webhooks ──────────────────────────────────────────────────

  async createWebhook(
    owner: string,
    repo: string,
    data: {
      url: string;
      contentType?: string;
      secret?: string;
      events?: string[];
      active?: boolean;
    }
  ) {
    let response = await this.http.post(`/repos/${owner}/${repo}/hooks`, {
      name: 'web',
      active: data.active ?? true,
      events: data.events ?? ['push'],
      config: {
        url: data.url,
        content_type: data.contentType ?? 'json',
        secret: data.secret
      }
    });
    return response.data;
  }

  async deleteWebhook(owner: string, repo: string, hookId: number) {
    await this.http.delete(`/repos/${owner}/${repo}/hooks/${hookId}`);
  }

  async listWebhooks(
    owner: string,
    repo: string,
    params: { perPage?: number; page?: number } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/hooks`, {
      params: { per_page: params.perPage, page: params.page }
    });
    return response.data;
  }

  // ─── Gists ─────────────────────────────────────────────────────

  async listGists(params: { since?: string; perPage?: number; page?: number } = {}) {
    let response = await this.http.get('/gists', {
      params: { ...params, per_page: params.perPage }
    });
    return response.data;
  }

  async getGist(gistId: string) {
    let response = await this.http.get(`/gists/${gistId}`);
    return response.data;
  }

  async createGist(data: {
    description?: string;
    public?: boolean;
    files: Record<string, { content: string }>;
  }) {
    let response = await this.http.post('/gists', data);
    return response.data;
  }

  async updateGist(
    gistId: string,
    data: {
      description?: string;
      files?: Record<string, { content?: string; filename?: string } | null>;
    }
  ) {
    let response = await this.http.patch(`/gists/${gistId}`, data);
    return response.data;
  }

  async deleteGist(gistId: string) {
    await this.http.delete(`/gists/${gistId}`);
  }

  // ─── Check Runs / Statuses ─────────────────────────────────────

  async listCheckRunsForRef(
    owner: string,
    repo: string,
    ref: string,
    params: {
      perPage?: number;
      page?: number;
    } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/commits/${ref}/check-runs`, {
      params: { per_page: params.perPage, page: params.page }
    });
    return response.data;
  }

  async createCommitStatus(
    owner: string,
    repo: string,
    sha: string,
    data: {
      state: string;
      targetUrl?: string;
      description?: string;
      context?: string;
    }
  ) {
    let body: Record<string, any> = {
      state: data.state,
      description: data.description,
      context: data.context
    };
    if (data.targetUrl) body.target_url = data.targetUrl;

    let response = await this.http.post(`/repos/${owner}/${repo}/statuses/${sha}`, body);
    return response.data;
  }

  async getCombinedStatus(owner: string, repo: string, ref: string) {
    let response = await this.http.get(`/repos/${owner}/${repo}/commits/${ref}/status`);
    return response.data;
  }

  // ─── Deployments ───────────────────────────────────────────────

  async listDeployments(
    owner: string,
    repo: string,
    params: {
      environment?: string;
      sha?: string;
      ref?: string;
      perPage?: number;
      page?: number;
    } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/deployments`, {
      params: { ...params, per_page: params.perPage }
    });
    return response.data;
  }

  async createDeployment(
    owner: string,
    repo: string,
    data: {
      ref: string;
      environment?: string;
      description?: string;
      autoMerge?: boolean;
      requiredContexts?: string[];
    }
  ) {
    let body: Record<string, any> = {
      ref: data.ref,
      environment: data.environment,
      description: data.description,
      auto_merge: data.autoMerge,
      required_contexts: data.requiredContexts
    };

    let response = await this.http.post(`/repos/${owner}/${repo}/deployments`, body);
    return response.data;
  }

  async createDeploymentStatus(
    owner: string,
    repo: string,
    deploymentId: number,
    data: {
      state: string;
      targetUrl?: string;
      description?: string;
      environment?: string;
      environmentUrl?: string;
    }
  ) {
    let body: Record<string, any> = {
      state: data.state,
      description: data.description,
      environment: data.environment
    };
    if (data.targetUrl) body.target_url = data.targetUrl;
    if (data.environmentUrl) body.environment_url = data.environmentUrl;

    let response = await this.http.post(
      `/repos/${owner}/${repo}/deployments/${deploymentId}/statuses`,
      body
    );
    return response.data;
  }

  // ─── Tags ──────────────────────────────────────────────────────

  async listTags(
    owner: string,
    repo: string,
    params: { perPage?: number; page?: number } = {}
  ) {
    let response = await this.read(
      `/repos/${owner}/${repo}/tags`,
      'list repository tags',
      'github_list_tags_failed',
      { params: { per_page: params.perPage, page: params.page } }
    );
    return response.data;
  }

  async getTag(owner: string, repo: string, tag: string) {
    let referenceResponse = await this.read(
      `/repos/${owner}/${repo}/git/ref/tags/${this.encodePath(tag)}`,
      'get repository tag reference',
      'github_get_tag_reference_failed'
    );
    let reference = referenceResponse.data;

    if (reference.object?.type !== 'tag') {
      return { reference, tagObject: null };
    }

    let tagObjectResponse = await this.read(
      `/repos/${owner}/${repo}/git/tags/${encodeURIComponent(reference.object.sha)}`,
      'get annotated repository tag',
      'github_get_tag_failed'
    );
    return { reference, tagObject: tagObjectResponse.data };
  }

  // ─── Forks ─────────────────────────────────────────────────────

  async createFork(
    owner: string,
    repo: string,
    data: { organization?: string; name?: string } = {}
  ) {
    let response = await this.http.post(`/repos/${owner}/${repo}/forks`, data);
    return response.data;
  }

  // ─── Stars ─────────────────────────────────────────────────────

  async listStargazers(
    owner: string,
    repo: string,
    params: { perPage?: number; page?: number } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/stargazers`, {
      params: { per_page: params.perPage, page: params.page }
    });
    return response.data;
  }

  async starRepository(owner: string, repo: string) {
    await this.http.put(`/user/starred/${owner}/${repo}`);
  }

  async unstarRepository(owner: string, repo: string) {
    await this.http.delete(`/user/starred/${owner}/${repo}`);
  }
}
