import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { createLocalSlateTestClient } from '@slates/test';
import { z } from 'zod';

let jiraClientMocks = {
  getComments: mock(() => Promise.resolve({})),
  getIssue: mock(() => Promise.resolve({}))
};

mock.module('../src/lib/client', () => ({
  JiraClient: class {
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
  ])('%s exposes both identifier fields in an MCP-compatible object schema', toolKey => {
    let schema = z.toJSONSchema(getTool(toolKey).inputSchema) as Record<string, unknown>;
    let properties = schema.properties as Record<string, { type?: string }>;
    let required = (schema.required as string[] | undefined) ?? [];

    expect(schema.type).toBe('object');
    expect('oneOf' in schema).toBe(false);
    expect('anyOf' in schema).toBe(false);
    expect('allOf' in schema).toBe(false);
    expect(properties.issueIdOrKey?.type).toBe('string');
    expect(properties.issueKey?.type).toBe('string');
    expect(required).not.toContain('issueIdOrKey');
    expect(required).not.toContain('issueKey');
  });

  it('accepts issueKey as a legacy get_issue alias', async () => {
    let client = createJiraToolTestClient();

    let result = await client.invokeTool('get_issue', {
      issueKey: 'TF-4335',
      fields: ['summary']
    });

    expect(jiraClientMocks.getIssue).toHaveBeenCalledWith('TF-4335', {
      fields: ['summary'],
      expand: undefined
    });
    expect(result.output).toMatchObject({
      issueId: '10000',
      issueKey: 'TF-4335',
      summary: 'Example issue'
    });
  });

  it('accepts issueKey as a legacy list_comments alias', async () => {
    let client = createJiraToolTestClient();

    let result = await client.invokeTool('list_comments', {
      issueKey: 'TF-4335',
      maxResults: 5
    });

    expect(jiraClientMocks.getComments).toHaveBeenCalledWith('TF-4335', {
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
      issueKey: 'TF-9999'
    });

    let apiMock =
      toolKey === 'get_issue' ? jiraClientMocks.getIssue : jiraClientMocks.getComments;
    expect(apiMock).toHaveBeenCalledWith('TF-4335', expect.any(Object));
  });

  it.each([
    'get_issue',
    'list_comments'
  ])('rejects %s calls that omit both identifier fields', async toolKey => {
    let client = createJiraToolTestClient();

    await expect(client.invokeTool(toolKey, {})).rejects.toThrow(
      'Provide the issue key or ID in issueIdOrKey.'
    );
  });
});
