import { createApiServiceError } from 'slates';
import { GitHubClient, type GitHubClientConfig } from './client';

export type IssueFieldInput = {
  field_name: string;
  value?: string | number | boolean;
  field_option_name?: string;
  delete?: true;
};

export type IssueFieldValue = {
  field_id: number;
  value: string | number | boolean;
};

export type IssueFieldChanges = {
  values: IssueFieldValue[];
  deleteFieldIds: number[];
};

export type IssueFieldUpdatePlan = {
  values: IssueFieldValue[] | undefined;
  fallbackDeleteFieldIds: number[];
};

export type GitHubIssueResponse = {
  id: number;
  number: number;
  title: string;
  state: string;
  html_url: string;
  user: { login: string };
  assignees?: Array<{ login: string }>;
  labels?: Array<{ name?: string } | string>;
  created_at: string;
  updated_at: string;
  type?: { name?: string } | string | null;
};

export type GitHubCommentResponse = {
  id: number;
  html_url: string;
  issue_url: string;
  user: { login: string };
  created_at: string;
};

export type GitHubReactionResponse = {
  id: number;
  content: string;
  user?: { login?: string };
  created_at?: string;
};

export type GitHubLabelResponse = {
  id: number;
  name: string;
  color: string;
  description: string | null;
};

type IssueFieldMetadata = {
  __typename?: string;
  fullDatabaseId?: string;
  name?: string;
  dataType?: string;
  options?: Array<{
    fullDatabaseId?: string;
    name?: string;
  }>;
};

type ExistingIssueFieldValue = {
  __typename?: string;
  dateValue?: string;
  numberValue?: number;
  singleSelectValue?: string;
  textValue?: string;
  field?: {
    fullDatabaseId?: string;
  };
};

const hasOwn = (value: object, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);

const parseFieldId = (value: string | undefined, fieldName: string) => {
  const fieldId = Number(value);
  if (!Number.isSafeInteger(fieldId) || fieldId < 1) {
    throw createApiServiceError(
      `GitHub issue field "${fieldName}" is missing a valid database ID.`,
      { reason: 'github_issue_field_id_invalid' }
    );
  }
  return fieldId;
};

export const validateIssueFields = (inputs: IssueFieldInput[] | undefined) => {
  if (!inputs) return;

  for (const input of inputs) {
    const fieldName = typeof input.field_name === 'string' ? input.field_name.trim() : '';
    if (!fieldName) {
      throw createApiServiceError('field_name is required for each issue_fields item.', {
        reason: 'github_issue_field_name_required'
      });
    }

    const hasValue = hasOwn(input, 'value');
    const hasOption = hasOwn(input, 'field_option_name');
    const shouldDelete = input.delete === true;
    const selectionCount = Number(hasValue) + Number(hasOption) + Number(shouldDelete);

    if (selectionCount !== 1) {
      throw createApiServiceError(
        `Issue field "${input.field_name}" must specify exactly one of value, field_option_name, or delete: true.`,
        { reason: 'github_issue_field_value_exclusive' }
      );
    }
    if (hasOption && !input.field_option_name?.trim()) {
      throw createApiServiceError(
        `field_option_name cannot be empty for issue field "${input.field_name}".`,
        { reason: 'github_issue_field_option_required' }
      );
    }
  }
};

export const resolveIssueNumber = (
  issueNumber: number | undefined,
  officialIssueNumber: number | undefined
) => {
  if (
    issueNumber !== undefined &&
    officialIssueNumber !== undefined &&
    issueNumber !== officialIssueNumber
  ) {
    throw createApiServiceError(
      'issueNumber and issue_number must refer to the same issue when both are provided.',
      { reason: 'github_issue_number_conflict' }
    );
  }
  return officialIssueNumber ?? issueNumber;
};

export const requirePositiveInteger = (value: number, field: string) => {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw createApiServiceError(`${field} must be a positive integer.`, {
      reason: 'github_issue_integer_invalid'
    });
  }
  return value;
};

export class GitHubIssuesLabelsClient {
  private client: GitHubClient;
  private apiBaseUrl: string;

  constructor(config: GitHubClientConfig) {
    this.client = new GitHubClient(config);
    const instanceUrl = config.instanceUrl?.replace(/\/+$/, '') || 'https://github.com';
    this.apiBaseUrl =
      instanceUrl === 'https://github.com'
        ? 'https://api.github.com'
        : `${instanceUrl}/api/v3`;
  }

  private encode(value: string | number) {
    return encodeURIComponent(String(value));
  }

  getRepositoryHtmlUrl(owner: string, repo: string) {
    return this.client.getRepositoryHtmlUrl(owner, repo);
  }

  async createIssueComment(owner: string, repo: string, issueNumber: number, body: string) {
    return this.client.requestRest<GitHubCommentResponse, { body: string }>({
      method: 'POST',
      path: `/repos/${this.encode(owner)}/${this.encode(repo)}/issues/${issueNumber}/comments`,
      body: { body },
      operation: 'create issue comment',
      reason: 'github_create_issue_comment_failed'
    });
  }

  async getIssueComment(owner: string, repo: string, commentId: number) {
    return this.client.requestRest<GitHubCommentResponse>({
      method: 'GET',
      path: `/repos/${this.encode(owner)}/${this.encode(repo)}/issues/comments/${commentId}`,
      operation: 'get issue comment',
      reason: 'github_get_issue_comment_failed'
    });
  }

  async addIssueReaction(owner: string, repo: string, issueNumber: number, reaction: string) {
    return this.client.requestRest<GitHubReactionResponse, { content: string }>({
      method: 'POST',
      path: `/repos/${this.encode(owner)}/${this.encode(repo)}/issues/${issueNumber}/reactions`,
      body: { content: reaction },
      operation: 'add issue reaction',
      reason: 'github_add_issue_reaction_failed'
    });
  }

  async addIssueCommentReaction(
    owner: string,
    repo: string,
    commentId: number,
    reaction: string
  ) {
    return this.client.requestRest<GitHubReactionResponse, { content: string }>({
      method: 'POST',
      path: `/repos/${this.encode(owner)}/${this.encode(repo)}/issues/comments/${commentId}/reactions`,
      body: { content: reaction },
      operation: 'add issue comment reaction',
      reason: 'github_add_issue_comment_reaction_failed'
    });
  }

  assertCommentBelongsToIssue(comment: GitHubCommentResponse, issueNumber: number) {
    const match = comment.issue_url.match(/\/issues\/(\d+)\/?$/);
    if (!match || Number(match[1]) !== issueNumber) {
      throw createApiServiceError(
        `comment_id does not belong to issue_number ${issueNumber}.`,
        { reason: 'github_issue_comment_target_mismatch' }
      );
    }
  }

  getIssueReactionApiUrl(
    owner: string,
    repo: string,
    issueNumber: number,
    reactionId: number
  ) {
    return `${this.apiBaseUrl}/repos/${this.encode(owner)}/${this.encode(repo)}/issues/${issueNumber}/reactions/${reactionId}`;
  }

  getIssueCommentReactionApiUrl(
    owner: string,
    repo: string,
    commentId: number,
    reactionId: number
  ) {
    return `${this.apiBaseUrl}/repos/${this.encode(owner)}/${this.encode(repo)}/issues/comments/${commentId}/reactions/${reactionId}`;
  }

  async createIssue(owner: string, repo: string, body: Record<string, unknown>) {
    return this.client.requestRest<GitHubIssueResponse, Record<string, unknown>>({
      method: 'POST',
      path: `/repos/${this.encode(owner)}/${this.encode(repo)}/issues`,
      body,
      operation: 'create issue',
      reason: 'github_create_issue_failed'
    });
  }

  async updateIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    body: Record<string, unknown>
  ) {
    return this.client.requestRest<GitHubIssueResponse, Record<string, unknown>>({
      method: 'PATCH',
      path: `/repos/${this.encode(owner)}/${this.encode(repo)}/issues/${issueNumber}`,
      body,
      operation: 'update issue',
      reason: 'github_update_issue_failed'
    });
  }

  async resolveIssueFieldChanges(
    owner: string,
    repo: string,
    inputs: IssueFieldInput[]
  ): Promise<IssueFieldChanges> {
    validateIssueFields(inputs);
    if (inputs.length === 0) return { values: [], deleteFieldIds: [] };

    const data = await this.client.requestGraphQL<{
      repository: null | {
        issueFields: {
          nodes: IssueFieldMetadata[];
        };
      };
    }>(
      `query ResolveIssueFieldMetadata($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          issueFields(first: 100) {
            nodes {
              __typename
              ... on IssueFieldText {
                fullDatabaseId
                name
                dataType
              }
              ... on IssueFieldNumber {
                fullDatabaseId
                name
                dataType
              }
              ... on IssueFieldDate {
                fullDatabaseId
                name
                dataType
              }
              ... on IssueFieldSingleSelect {
                fullDatabaseId
                name
                dataType
                options {
                  fullDatabaseId
                  name
                }
              }
            }
          }
        }
      }`,
      { owner, repo },
      ['issue_fields', 'repo_issue_fields']
    );

    if (!data.repository) {
      throw createApiServiceError(
        `GitHub repository "${owner}/${repo}" was not found or is not accessible.`,
        { reason: 'github_issue_fields_repository_unavailable' }
      );
    }

    const fieldsByName = new Map(
      data.repository.issueFields.nodes.flatMap(field =>
        field.name ? [[field.name.trim().toLowerCase(), field] as const] : []
      )
    );
    const values: IssueFieldValue[] = [];
    const deleteFieldIds: number[] = [];

    for (const input of inputs) {
      const field = fieldsByName.get(input.field_name.trim().toLowerCase());
      if (!field) {
        throw createApiServiceError(
          `Issue field "${input.field_name}" was not found in ${owner}/${repo}.`,
          { reason: 'github_issue_field_not_found' }
        );
      }
      const fieldId = parseFieldId(field.fullDatabaseId, input.field_name);

      if (input.delete === true) {
        deleteFieldIds.push(fieldId);
        continue;
      }

      let value = input.value;
      if (input.field_option_name !== undefined) {
        if (field.dataType?.toLowerCase() !== 'single_select') {
          throw createApiServiceError(
            `Issue field "${input.field_name}" is "${field.dataType ?? 'unknown'}", so field_option_name cannot be used.`,
            { reason: 'github_issue_field_option_type_invalid' }
          );
        }
        const option = field.options?.find(
          candidate =>
            candidate.name?.trim().toLowerCase() ===
            input.field_option_name?.trim().toLowerCase()
        );
        if (!option?.name) {
          throw createApiServiceError(
            `Issue field option "${input.field_option_name}" was not found for field "${input.field_name}".`,
            { reason: 'github_issue_field_option_not_found' }
          );
        }
        value = option.name;
      }

      if (value === undefined) {
        throw createApiServiceError(
          `Issue field "${input.field_name}" did not resolve to a value.`,
          { reason: 'github_issue_field_value_missing' }
        );
      }
      values.push({ field_id: fieldId, value });
    }

    return { values, deleteFieldIds };
  }

  private async getExistingIssueFieldValues(
    owner: string,
    repo: string,
    issueNumber: number
  ): Promise<IssueFieldValue[]> {
    const data = await this.client.requestGraphQL<{
      repository: null | {
        issue: null | {
          issueFieldValues: {
            nodes: ExistingIssueFieldValue[];
          };
        };
      };
    }>(
      `query ExistingIssueFieldValues(
        $owner: String!
        $repo: String!
        $issueNumber: Int!
      ) {
        repository(owner: $owner, name: $repo) {
          issue(number: $issueNumber) {
            issueFieldValues(first: 100) {
              nodes {
                __typename
                ... on IssueFieldDateValue {
                  dateValue: value
                  field {
                    ... on IssueFieldDate {
                      fullDatabaseId
                    }
                  }
                }
                ... on IssueFieldNumberValue {
                  numberValue: value
                  field {
                    ... on IssueFieldNumber {
                      fullDatabaseId
                    }
                  }
                }
                ... on IssueFieldSingleSelectValue {
                  singleSelectValue: value
                  field {
                    ... on IssueFieldSingleSelect {
                      fullDatabaseId
                    }
                  }
                }
                ... on IssueFieldTextValue {
                  textValue: value
                  field {
                    ... on IssueFieldText {
                      fullDatabaseId
                    }
                  }
                }
              }
            }
          }
        }
      }`,
      { owner, repo, issueNumber },
      ['issue_fields', 'repo_issue_fields']
    );
    const issue = data.repository?.issue;
    if (!issue) {
      throw createApiServiceError(
        `GitHub issue "${owner}/${repo}#${issueNumber}" was not found or is not accessible.`,
        { reason: 'github_issue_fields_issue_unavailable' }
      );
    }

    return issue.issueFieldValues.nodes.flatMap(node => {
      const fieldIdValue = Number(node.field?.fullDatabaseId);
      if (!Number.isSafeInteger(fieldIdValue) || fieldIdValue < 1) return [];
      const value =
        node.__typename === 'IssueFieldDateValue'
          ? node.dateValue
          : node.__typename === 'IssueFieldNumberValue'
            ? node.numberValue
            : node.__typename === 'IssueFieldSingleSelectValue'
              ? node.singleSelectValue
              : node.textValue;
      return value === undefined ? [] : [{ field_id: fieldIdValue, value }];
    });
  }

  async prepareIssueFieldUpdate(
    owner: string,
    repo: string,
    issueNumber: number,
    changes: IssueFieldChanges
  ): Promise<IssueFieldUpdatePlan> {
    const existing = await this.getExistingIssueFieldValues(owner, repo, issueNumber);
    const incomingIds = new Set(changes.values.map(value => value.field_id));
    const deleteIds = new Set(changes.deleteFieldIds);
    const values = [
      ...changes.values,
      ...existing.filter(
        value => !incomingIds.has(value.field_id) && !deleteIds.has(value.field_id)
      )
    ];

    return {
      values: values.length > 0 ? values : undefined,
      fallbackDeleteFieldIds:
        values.length === 0
          ? changes.deleteFieldIds.filter(fieldId =>
              existing.some(value => value.field_id === fieldId)
            )
          : []
    };
  }

  async deleteIssueFieldValue(
    owner: string,
    repo: string,
    issueNumber: number,
    fieldId: number
  ) {
    await this.client.requestRest<unknown>({
      method: 'DELETE',
      path: `/repos/${this.encode(owner)}/${this.encode(repo)}/issues/${issueNumber}/issue-field-values/${fieldId}`,
      operation: 'clear issue field value',
      reason: 'github_delete_issue_field_value_failed'
    });
  }

  private async resolveIssueNodeIds(
    owner: string,
    repo: string,
    issueNumber: number,
    duplicateOf?: number
  ) {
    if (duplicateOf === undefined) {
      const data = await this.client.requestGraphQL<{
        repository: null | {
          issue: null | { id: string };
        };
      }>(
        `query ResolveIssueNodeId($owner: String!, $repo: String!, $issueNumber: Int!) {
          repository(owner: $owner, name: $repo) {
            issue(number: $issueNumber) {
              id
            }
          }
        }`,
        { owner, repo, issueNumber }
      );
      const issueId = data.repository?.issue?.id;
      if (!issueId) {
        throw createApiServiceError(
          `GitHub issue "${owner}/${repo}#${issueNumber}" was not found or is not accessible.`,
          { reason: 'github_issue_node_id_unavailable' }
        );
      }
      return { issueId, duplicateIssueId: undefined };
    }

    const data = await this.client.requestGraphQL<{
      repository: null | {
        issue: null | { id: string };
        duplicateIssue: null | { id: string };
      };
    }>(
      `query ResolveIssueNodeIds(
        $owner: String!
        $repo: String!
        $issueNumber: Int!
        $duplicateOf: Int!
      ) {
        repository(owner: $owner, name: $repo) {
          issue(number: $issueNumber) {
            id
          }
          duplicateIssue: issue(number: $duplicateOf) {
            id
          }
        }
      }`,
      { owner, repo, issueNumber, duplicateOf }
    );
    const issueId = data.repository?.issue?.id;
    const duplicateIssueId = data.repository?.duplicateIssue?.id;
    if (!issueId || !duplicateIssueId) {
      throw createApiServiceError(
        `GitHub could not resolve issue #${issueNumber} and duplicate target #${duplicateOf} in ${owner}/${repo}.`,
        { reason: 'github_duplicate_issue_node_id_unavailable' }
      );
    }
    return { issueId, duplicateIssueId };
  }

  async updateIssueState(
    owner: string,
    repo: string,
    issueNumber: number,
    state: 'closed' | 'open',
    stateReason: 'completed' | 'duplicate' | 'not_planned' | 'reopened' | undefined,
    duplicateOf: number | undefined
  ) {
    const { issueId, duplicateIssueId } = await this.resolveIssueNodeIds(
      owner,
      repo,
      issueNumber,
      state === 'closed' && stateReason === 'duplicate' ? duplicateOf : undefined
    );

    if (state === 'open') {
      await this.client.requestGraphQL(
        `mutation ReopenIssue($input: ReopenIssueInput!) {
          reopenIssue(input: $input) {
            issue {
              id
              number
              url
              state
            }
          }
        }`,
        { input: { issueId } }
      );
      return;
    }

    const reason =
      stateReason === 'not_planned'
        ? 'NOT_PLANNED'
        : stateReason === 'duplicate'
          ? 'DUPLICATE'
          : 'COMPLETED';
    await this.client.requestGraphQL(
      `mutation CloseIssue($input: CloseIssueInput!) {
        closeIssue(input: $input) {
          issue {
            id
            number
            url
            state
          }
        }
      }`,
      {
        input: {
          issueId,
          stateReason: reason,
          ...(duplicateIssueId ? { duplicateIssueId } : {})
        }
      }
    );
  }

  async listLabels(owner: string, repo: string, params: { perPage?: number; page?: number }) {
    return this.client.requestRest<GitHubLabelResponse[]>({
      method: 'GET',
      path: `/repos/${this.encode(owner)}/${this.encode(repo)}/labels`,
      query: {
        per_page: params.perPage,
        page: params.page
      },
      operation: 'list repository labels',
      reason: 'github_list_labels_failed'
    });
  }

  async createLabel(
    owner: string,
    repo: string,
    body: { name: string; color: string; description?: string }
  ) {
    return this.client.requestRest<
      GitHubLabelResponse,
      { name: string; color: string; description?: string }
    >({
      method: 'POST',
      path: `/repos/${this.encode(owner)}/${this.encode(repo)}/labels`,
      body,
      operation: 'create repository label',
      reason: 'github_create_label_failed'
    });
  }

  async updateLabel(
    owner: string,
    repo: string,
    name: string,
    body: { new_name?: string; color?: string; description?: string }
  ) {
    return this.client.requestRest<
      GitHubLabelResponse,
      { new_name?: string; color?: string; description?: string }
    >({
      method: 'PATCH',
      path: `/repos/${this.encode(owner)}/${this.encode(repo)}/labels/${this.encode(name)}`,
      body,
      operation: 'update repository label',
      reason: 'github_update_label_failed'
    });
  }

  async deleteLabel(owner: string, repo: string, name: string) {
    await this.client.requestRest<unknown>({
      method: 'DELETE',
      path: `/repos/${this.encode(owner)}/${this.encode(repo)}/labels/${this.encode(name)}`,
      operation: 'delete repository label',
      reason: 'github_delete_label_failed'
    });
  }
}
