import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { createLocalSlateTestClient } from '@slates/test';
import { z } from 'zod';

let jiraClientMocks = {
  addComment: mock(() => Promise.resolve({})),
  getComments: mock(() => Promise.resolve({})),
  getIssue: mock(() => Promise.resolve({}))
};

mock.module('../src/lib/client', () => ({
  JiraClient: class {
    addComment(...args: unknown[]) {
      return jiraClientMocks.addComment(...args);
    }

    getComments(...args: unknown[]) {
      return jiraClientMocks.getComments(...args);
    }

    getIssue(...args: unknown[]) {
      return jiraClientMocks.getIssue(...args);
    }
  }
}));

let { provider } = await import('../src/index');

let createJiraToolTestClient = () =>
  createLocalSlateTestClient({
    slate: provider as any,
    state: {
      config: {},
      auth: {
        authenticationMethodId: 'oauth2',
        output: {
          token: 'test-token',
          cloudId: 'test-cloud-id',
          refreshToken: 'test-refresh-token'
        }
      }
    }
  });

let getTool = (key: string) => {
  let action = provider.actions.find(candidate => candidate.key === key);
  if (!action || !('inputSchema' in action)) {
    throw new Error(`Jira tool ${key} was not found.`);
  }

  return action;
};

beforeEach(() => {
  jiraClientMocks.addComment.mockClear();
  jiraClientMocks.addComment.mockResolvedValue({
    id: '10002',
    author: { displayName: 'Example User' },
    created: '2026-08-24T10:00:00.000Z'
  });
  jiraClientMocks.getComments.mockClear();
  jiraClientMocks.getComments.mockResolvedValue({
    total: 1,
    comments: [
      {
        id: '10001',
        author: { accountId: 'account-1', displayName: 'Example User' },
        body: { type: 'doc', version: 1, content: [] },
        created: '2026-07-17T10:00:00.000Z',
        updated: '2026-07-17T10:00:00.000Z'
      }
    ]
  });
  jiraClientMocks.getIssue.mockClear();
  jiraClientMocks.getIssue.mockResolvedValue({
    id: '10000',
    key: 'TF-4335',
    self: 'https://api.atlassian.com/ex/jira/test-cloud-id/rest/api/3/issue/10000',
    fields: { summary: 'Example issue' }
  });
});

describe('Jira issueKey input compatibility', () => {
  it.each([
    'get_issue',
    'list_comments'
  ])('%s exposes identifier aliases in an MCP-compatible object schema', toolKey => {
    let schema = z.toJSONSchema(getTool(toolKey).inputSchema) as Record<string, unknown>;
    let properties = schema.properties as Record<string, { type?: string }>;
    let required = (schema.required as string[] | undefined) ?? [];

    expect(schema.type).toBe('object');
    expect('oneOf' in schema).toBe(false);
    expect('anyOf' in schema).toBe(false);
    expect('allOf' in schema).toBe(false);
    expect(properties.issueIdOrKey?.type).toBe('string');
    expect(properties.issueKeyOrId?.type).toBe('string');
    expect(properties.issueKey?.type).toBe('string');
    expect(properties.issue_key?.type).toBe('string');
    expect(required).not.toContain('issueIdOrKey');
    expect(required).not.toContain('issueKeyOrId');
    expect(required).not.toContain('issueKey');
    expect(required).not.toContain('issue_key');
  });

  it.each([
    ['issueKeyOrId', 'TF-4335'],
    ['issueKey', 'TF-4335'],
    ['issue_key', 'TF-4335']
  ])('accepts %s as a legacy get_issue alias', async (field, issueIdOrKey) => {
    let client = createJiraToolTestClient();

    let result = await client.invokeTool('get_issue', {
      [field]: issueIdOrKey,
      fields: ['summary']
    });

    expect(jiraClientMocks.getIssue).toHaveBeenCalledWith(issueIdOrKey, {
      fields: ['summary'],
      expand: undefined
    });
    expect(result.output).toMatchObject({
      issueId: '10000',
      issueKey: 'TF-4335',
      summary: 'Example issue'
    });
  });

  it.each([
    ['issueKeyOrId', 'TF-4335'],
    ['issueKey', 'TF-4335'],
    ['issue_key', 'TF-4335']
  ])('accepts %s as a legacy list_comments alias', async (field, issueIdOrKey) => {
    let client = createJiraToolTestClient();

    let result = await client.invokeTool('list_comments', {
      [field]: issueIdOrKey,
      maxResults: 5
    });

    expect(jiraClientMocks.getComments).toHaveBeenCalledWith(issueIdOrKey, {
      startAt: 0,
      maxResults: 5
    });
    expect(result.output.comments).toHaveLength(1);
    expect(result.message).toContain('on **TF-4335**');
  });

  it.each([
    'get_issue',
    'list_comments'
  ])('prefers issueIdOrKey when both identifiers are supplied to %s', async toolKey => {
    let client = createJiraToolTestClient();

    await client.invokeTool(toolKey, {
      issueIdOrKey: 'TF-4335',
      issueKeyOrId: 'TF-8888',
      issueKey: 'TF-9999'
    });

    let apiMock =
      toolKey === 'get_issue' ? jiraClientMocks.getIssue : jiraClientMocks.getComments;
    expect(apiMock).toHaveBeenCalledWith('TF-4335', expect.any(Object));
  });

  it.each([
    'get_issue',
    'list_comments'
  ])('rejects %s calls that omit all identifier fields', async toolKey => {
    let client = createJiraToolTestClient();

    await expect(client.invokeTool(toolKey, {})).rejects.toThrow(
      'Provide the issue key or ID in issueIdOrKey.'
    );
  });
});

describe('Jira Mender input compatibility', () => {
  it('accepts a single get_issue expand value and normalizes it for Jira', async () => {
    let client = createJiraToolTestClient();

    await client.invokeTool('get_issue', {
      issueIdOrKey: 'TF-7919',
      expand: 'renderedFields'
    });

    expect(jiraClientMocks.getIssue).toHaveBeenCalledWith('TF-7919', {
      fields: undefined,
      expand: ['renderedFields']
    });
  });

  it('accepts commentBody as a legacy add_comment alias', async () => {
    let client = createJiraToolTestClient();

    let result = await client.invokeTool('add_comment', {
      issueIdOrKey: 'TF-5832',
      commentBody: 'Compatibility comment'
    });

    expect(jiraClientMocks.addComment).toHaveBeenCalledWith('TF-5832', {
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Compatibility comment' }]
        }
      ]
    });
    expect(result.output).toMatchObject({
      commentId: '10002',
      issueIdOrKey: 'TF-5832'
    });
  });

  it('prefers body when both add_comment body fields are supplied', async () => {
    let client = createJiraToolTestClient();

    await client.invokeTool('add_comment', {
      issueIdOrKey: 'TF-5832',
      body: 'Preferred comment',
      commentBody: 'Legacy comment'
    });

    expect(jiraClientMocks.addComment).toHaveBeenCalledWith(
      'TF-5832',
      expect.objectContaining({
        content: [
          expect.objectContaining({
            content: [{ type: 'text', text: 'Preferred comment' }]
          })
        ]
      })
    );
  });

  it('rejects add_comment calls that omit both body fields', async () => {
    let client = createJiraToolTestClient();

    await expect(
      client.invokeTool('add_comment', { issueIdOrKey: 'TF-5832' })
    ).rejects.toThrow('Provide the comment body in body.');
  });
});
