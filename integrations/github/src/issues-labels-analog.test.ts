import { expectMcpCompatibleToolSchema } from '@slates/test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { GitHubIssuesLabelsClient, validateIssueFields } from './lib/github-issues-labels';
import { commentOnIssue } from './tools/comment-on-issue';
import { manageIssue } from './tools/manage-issue';
import { manageLabels } from './tools/manage-labels';

const context = {
  auth: {
    token: 'test-token',
    instanceUrl: 'https://github.com'
  },
  config: {}
};

const issue = {
  id: 101,
  number: 7,
  title: 'Track analog coverage',
  state: 'open',
  html_url: 'https://github.com/octocat/hello-world/issues/7',
  user: { login: 'octocat' },
  assignees: [{ login: 'hubot' }],
  labels: [{ name: 'enhancement' }],
  created_at: '2026-07-28T00:00:00Z',
  updated_at: '2026-07-29T00:00:00Z',
  type: { name: 'Task' }
};

const comment = {
  id: 88,
  html_url: 'https://github.com/octocat/hello-world/issues/7#issuecomment-88',
  issue_url: 'https://api.github.com/repos/octocat/hello-world/issues/7',
  user: { login: 'octocat' },
  created_at: '2026-07-29T12:00:00Z'
};

const label = {
  id: 55,
  name: 'priority-high',
  color: 'ff0000',
  description: 'Needs attention'
};

const invoke = (tool: any, input: Record<string, unknown>) =>
  tool.handleInvocation({ ...context, input });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GitHub issue and label analog schemas', () => {
  it('keeps each consolidated schema MCP-compatible, scoped, and under the ID limit', () => {
    for (const tool of [commentOnIssue, manageIssue, manageLabels]) {
      expectMcpCompatibleToolSchema(tool);
      expect(tool.scopes).toEqual({ AND: [{ OR: ['repo', 'public_repo'] }] });
      expect(`github-${tool.key}`.length).toBeLessThan(60);
    }
  });

  it('adds the official add_issue_comment contract without removing legacy fields', () => {
    const schema = z.toJSONSchema(commentOnIssue.inputSchema) as any;
    expect(Object.keys(schema.properties)).toEqual([
      'owner',
      'repo',
      'issueNumber',
      'issue_number',
      'comment_id',
      'body',
      'reaction'
    ]);
    expect(schema.required).toEqual(['owner', 'repo']);
    expect(schema.properties.reaction.enum).toEqual([
      '+1',
      '-1',
      'laugh',
      'confused',
      'heart',
      'hooray',
      'rocket',
      'eyes'
    ]);
    expect(schema.properties.comment_id.minimum).toBe(1);
  });

  it('adds official issue_write and label_write fields additively', () => {
    const issueSchema = z.toJSONSchema(manageIssue.inputSchema) as any;
    expect(Object.keys(issueSchema.properties)).toEqual([
      'method',
      'owner',
      'repo',
      'issueNumber',
      'issue_number',
      'title',
      'body',
      'state',
      'stateReason',
      'state_reason',
      'duplicate_of',
      'labels',
      'assignees',
      'milestone',
      'type',
      'issue_fields'
    ]);
    expect(issueSchema.required).toEqual(['owner', 'repo']);
    expect(issueSchema.properties.method.enum).toEqual(['create', 'update']);
    expect(issueSchema.properties.state_reason.enum).toEqual([
      'completed',
      'not_planned',
      'duplicate'
    ]);
    expect(issueSchema.properties.issue_fields.items.required).toEqual(['field_name']);
    expect(issueSchema.properties.issue_fields.items.additionalProperties).toBe(false);

    const labelSchema = z.toJSONSchema(manageLabels.inputSchema) as any;
    expect(Object.keys(labelSchema.properties)).toEqual([
      'owner',
      'repo',
      'action',
      'method',
      'name',
      'new_name',
      'color',
      'description',
      'perPage',
      'page'
    ]);
    expect(labelSchema.required).toEqual(['owner', 'repo']);
    expect(labelSchema.properties.method.enum).toEqual(['create', 'update', 'delete']);
  });
});

describe('comment_on_issue analog behavior', () => {
  it('preserves legacy body-only calls and their output fields', async () => {
    const create = vi
      .spyOn(GitHubIssuesLabelsClient.prototype, 'createIssueComment')
      .mockResolvedValue(comment);

    const result = await invoke(commentOnIssue, {
      owner: 'octocat',
      repo: 'hello-world',
      issueNumber: 7,
      body: 'Looks good'
    });

    expect(create).toHaveBeenCalledWith('octocat', 'hello-world', 7, 'Looks good');
    expect(result.output).toMatchObject({
      commentId: 88,
      htmlUrl: comment.html_url,
      author: 'octocat',
      createdAt: comment.created_at,
      comment: { commentId: 88 }
    });
  });

  it('adds reactions to verified issue comments using official field names', async () => {
    const get = vi
      .spyOn(GitHubIssuesLabelsClient.prototype, 'getIssueComment')
      .mockResolvedValue(comment);
    const react = vi
      .spyOn(GitHubIssuesLabelsClient.prototype, 'addIssueCommentReaction')
      .mockResolvedValue({
        id: 99,
        content: 'rocket',
        user: { login: 'hubot' },
        created_at: '2026-07-29T12:01:00Z'
      });

    const result = await invoke(commentOnIssue, {
      owner: 'octocat',
      repo: 'hello-world',
      issue_number: 7,
      comment_id: 88,
      reaction: 'rocket'
    });

    expect(get).toHaveBeenCalledWith('octocat', 'hello-world', 88);
    expect(react).toHaveBeenCalledWith('octocat', 'hello-world', 88, 'rocket');
    expect(result.output.reaction).toMatchObject({
      reactionId: 99,
      content: 'rocket',
      target: 'comment',
      author: 'hubot'
    });
  });

  it('enforces conditional body, reaction, and comment target semantics', async () => {
    await expect(
      invoke(commentOnIssue, {
        owner: 'octocat',
        repo: 'hello-world',
        issue_number: 7
      })
    ).rejects.toThrow('At least one of body or reaction');
    await expect(
      invoke(commentOnIssue, {
        owner: 'octocat',
        repo: 'hello-world',
        issue_number: 7,
        comment_id: 88,
        body: 'Not allowed',
        reaction: 'eyes'
      })
    ).rejects.toThrow('comment_id cannot be combined with body');
    await expect(
      invoke(commentOnIssue, {
        owner: 'octocat',
        repo: 'hello-world',
        issueNumber: 7,
        issue_number: 8,
        body: 'Mismatch'
      })
    ).rejects.toThrow('must refer to the same issue');

    const client = new GitHubIssuesLabelsClient(context.auth);
    expect(() =>
      client.assertCommentBelongsToIssue(
        { ...comment, issue_url: 'https://api.github.com/repos/octocat/hello-world/issues/9' },
        7
      )
    ).toThrow('comment_id does not belong to issue_number 7');
  });
});

describe('manage_issue analog behavior', () => {
  it('preserves inferred legacy create calls', async () => {
    const create = vi
      .spyOn(GitHubIssuesLabelsClient.prototype, 'createIssue')
      .mockResolvedValue(issue);

    const result = await invoke(manageIssue, {
      owner: 'octocat',
      repo: 'hello-world',
      title: 'Track analog coverage',
      body: 'Implement the missing surface',
      labels: ['enhancement'],
      assignees: ['hubot'],
      milestone: 2
    });

    expect(create).toHaveBeenCalledWith('octocat', 'hello-world', {
      title: 'Track analog coverage',
      body: 'Implement the missing surface',
      labels: ['enhancement'],
      assignees: ['hubot'],
      milestone: 2
    });
    expect(result.output).toMatchObject({
      issueNumber: 7,
      issueId: 101,
      type: 'Task',
      labels: ['enhancement'],
      assignees: ['hubot']
    });
  });

  it('resolves official issue fields and issue type for create', async () => {
    const resolve = vi
      .spyOn(GitHubIssuesLabelsClient.prototype, 'resolveIssueFieldChanges')
      .mockResolvedValue({
        values: [
          { field_id: 10, value: 'High' },
          { field_id: 11, value: 3 }
        ],
        deleteFieldIds: []
      });
    const create = vi
      .spyOn(GitHubIssuesLabelsClient.prototype, 'createIssue')
      .mockResolvedValue(issue);
    const issueFields = [
      { field_name: 'Priority', field_option_name: 'High' },
      { field_name: 'Estimate', value: 3 }
    ];

    await invoke(manageIssue, {
      method: 'create',
      owner: 'octocat',
      repo: 'hello-world',
      title: 'Track analog coverage',
      type: 'Task',
      issue_fields: issueFields
    });

    expect(resolve).toHaveBeenCalledWith('octocat', 'hello-world', issueFields);
    expect(create).toHaveBeenCalledWith('octocat', 'hello-world', {
      title: 'Track analog coverage',
      type: 'Task',
      issue_field_values: [
        { field_id: 10, value: 'High' },
        { field_id: 11, value: 3 }
      ]
    });
  });

  it('merges field changes, clears fallback fields, and closes duplicates', async () => {
    const resolve = vi
      .spyOn(GitHubIssuesLabelsClient.prototype, 'resolveIssueFieldChanges')
      .mockResolvedValue({
        values: [],
        deleteFieldIds: [10]
      });
    const prepare = vi
      .spyOn(GitHubIssuesLabelsClient.prototype, 'prepareIssueFieldUpdate')
      .mockResolvedValue({
        values: undefined,
        fallbackDeleteFieldIds: [10]
      });
    const update = vi
      .spyOn(GitHubIssuesLabelsClient.prototype, 'updateIssue')
      .mockResolvedValue(issue);
    const clear = vi
      .spyOn(GitHubIssuesLabelsClient.prototype, 'deleteIssueFieldValue')
      .mockResolvedValue(undefined);
    const state = vi
      .spyOn(GitHubIssuesLabelsClient.prototype, 'updateIssueState')
      .mockResolvedValue(undefined);

    const result = await invoke(manageIssue, {
      method: 'update',
      owner: 'octocat',
      repo: 'hello-world',
      issue_number: 7,
      state: 'closed',
      state_reason: 'duplicate',
      duplicate_of: 3,
      issue_fields: [{ field_name: 'Priority', delete: true }],
      labels: []
    });

    expect(resolve).toHaveBeenCalled();
    expect(prepare).toHaveBeenCalledWith('octocat', 'hello-world', 7, {
      values: [],
      deleteFieldIds: [10]
    });
    expect(update).toHaveBeenCalledWith('octocat', 'hello-world', 7, {
      labels: []
    });
    expect(clear).toHaveBeenCalledWith('octocat', 'hello-world', 7, 10);
    expect(state).toHaveBeenCalledWith('octocat', 'hello-world', 7, 'closed', 'duplicate', 3);
    expect(result.output).toMatchObject({
      issueNumber: 7,
      state: 'closed',
      stateReason: 'duplicate'
    });
  });

  it('enforces update, duplicate, and exactly-one issue field validation', async () => {
    await expect(
      invoke(manageIssue, {
        method: 'update',
        owner: 'octocat',
        repo: 'hello-world'
      })
    ).rejects.toThrow('issue_number is required');
    await expect(
      invoke(manageIssue, {
        method: 'update',
        owner: 'octocat',
        repo: 'hello-world',
        issue_number: 7,
        state: 'closed',
        state_reason: 'duplicate'
      })
    ).rejects.toThrow('duplicate_of must be provided');
    expect(() =>
      validateIssueFields([
        {
          field_name: 'Priority',
          value: 'High',
          field_option_name: 'High'
        }
      ])
    ).toThrow('exactly one');
    expect(() =>
      validateIssueFields([
        {
          field_name: 'Priority'
        }
      ])
    ).toThrow('exactly one');
  });
});

describe('manage_labels analog behavior', () => {
  it('preserves legacy list/create and adds official update/delete operations', async () => {
    const list = vi
      .spyOn(GitHubIssuesLabelsClient.prototype, 'listLabels')
      .mockResolvedValue([label]);
    const create = vi
      .spyOn(GitHubIssuesLabelsClient.prototype, 'createLabel')
      .mockResolvedValue(label);
    const update = vi
      .spyOn(GitHubIssuesLabelsClient.prototype, 'updateLabel')
      .mockResolvedValue({ ...label, description: '' });
    const remove = vi
      .spyOn(GitHubIssuesLabelsClient.prototype, 'deleteLabel')
      .mockResolvedValue(undefined);

    const listResult = await invoke(manageLabels, {
      owner: 'octocat',
      repo: 'hello-world',
      action: 'list',
      perPage: 10
    });
    expect(list).toHaveBeenCalledWith('octocat', 'hello-world', {
      perPage: 10,
      page: undefined
    });
    expect(listResult.output.labels).toEqual([
      {
        labelId: 55,
        name: 'priority-high',
        color: 'ff0000',
        description: 'Needs attention'
      }
    ]);

    await invoke(manageLabels, {
      owner: 'octocat',
      repo: 'hello-world',
      action: 'create',
      name: 'priority-high',
      color: 'ff0000'
    });
    expect(create).toHaveBeenCalledWith('octocat', 'hello-world', {
      name: 'priority-high',
      color: 'ff0000'
    });

    await invoke(manageLabels, {
      method: 'update',
      owner: 'octocat',
      repo: 'hello-world',
      name: 'priority-high',
      new_name: 'urgent',
      description: ''
    });
    expect(update).toHaveBeenCalledWith('octocat', 'hello-world', 'priority-high', {
      new_name: 'urgent',
      description: ''
    });

    const deleteResult = await invoke(manageLabels, {
      method: 'delete',
      owner: 'octocat',
      repo: 'hello-world',
      name: 'priority-high'
    });
    expect(remove).toHaveBeenCalledWith('octocat', 'hello-world', 'priority-high');
    expect(deleteResult.output).toEqual({
      deleted: true,
      deletedName: 'priority-high'
    });
  });

  it('validates create and update requirements with ServiceErrors', async () => {
    await expect(
      invoke(manageLabels, {
        method: 'create',
        owner: 'octocat',
        repo: 'hello-world',
        name: 'missing-color'
      })
    ).rejects.toThrow('color is required');
    await expect(
      invoke(manageLabels, {
        method: 'update',
        owner: 'octocat',
        repo: 'hello-world',
        name: 'nothing-to-change'
      })
    ).rejects.toThrow('At least one of new_name, color, or description');
  });
});

describe('GitHub issue-field helper semantics', () => {
  const createClient = () => {
    const requestRest = vi.fn();
    const requestGraphQL = vi.fn();
    const client = new GitHubIssuesLabelsClient(context.auth);
    (client as any).client = {
      requestRest,
      requestGraphQL,
      getRepositoryHtmlUrl: (owner: string, repo: string) =>
        `https://github.com/${owner}/${repo}`
    };
    return { client, requestRest, requestGraphQL };
  };

  it('resolves field and option names case-insensitively to REST values', async () => {
    const { client, requestGraphQL } = createClient();
    requestGraphQL.mockResolvedValue({
      repository: {
        issueFields: {
          nodes: [
            {
              __typename: 'IssueFieldSingleSelect',
              fullDatabaseId: '10',
              name: 'Priority',
              dataType: 'SINGLE_SELECT',
              options: [{ fullDatabaseId: '100', name: 'High' }]
            },
            {
              __typename: 'IssueFieldNumber',
              fullDatabaseId: '11',
              name: 'Estimate',
              dataType: 'NUMBER'
            }
          ]
        }
      }
    });

    await expect(
      client.resolveIssueFieldChanges('octocat', 'hello-world', [
        { field_name: 'priority', field_option_name: 'high' },
        { field_name: 'Estimate', value: 5 },
        { field_name: 'Priority', delete: true }
      ])
    ).resolves.toEqual({
      values: [
        { field_id: 10, value: 'High' },
        { field_id: 11, value: 5 }
      ],
      deleteFieldIds: [10]
    });
    expect(requestGraphQL).toHaveBeenCalledWith(
      expect.stringContaining('ResolveIssueFieldMetadata'),
      { owner: 'octocat', repo: 'hello-world' },
      ['issue_fields', 'repo_issue_fields']
    );
  });

  it('merges incoming and existing issue fields without clearing unrelated values', async () => {
    const { client, requestGraphQL } = createClient();
    requestGraphQL.mockResolvedValue({
      repository: {
        issue: {
          issueFieldValues: {
            nodes: [
              {
                __typename: 'IssueFieldSingleSelectValue',
                singleSelectValue: 'Low',
                field: { fullDatabaseId: '10' }
              },
              {
                __typename: 'IssueFieldNumberValue',
                numberValue: 8,
                field: { fullDatabaseId: '11' }
              }
            ]
          }
        }
      }
    });

    await expect(
      client.prepareIssueFieldUpdate('octocat', 'hello-world', 7, {
        values: [{ field_id: 10, value: 'High' }],
        deleteFieldIds: []
      })
    ).resolves.toEqual({
      values: [
        { field_id: 10, value: 'High' },
        { field_id: 11, value: 8 }
      ],
      fallbackDeleteFieldIds: []
    });
  });
});
