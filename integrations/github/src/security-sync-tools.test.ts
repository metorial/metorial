import { expectMcpCompatibleToolSchema } from '@slates/test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { GitHubClient } from './lib/client';
import { GitHubSecurityApi } from './lib/github-security';
import { getCodeQualityFinding } from './tools/get-code-quality-finding';
import { getCodeScanningAlert } from './tools/get-code-scanning-alert';
import { getDependabotAlert } from './tools/get-dependabot-alert';
import { getSecretScanningAlert } from './tools/get-secret-scanning-alert';
import { listCodeScanningAlerts } from './tools/list-code-scanning-alerts';
import { listDependabotAlerts } from './tools/list-dependabot-alerts';
import { listOrgRepositorySecurityAdvisories } from './tools/list-org-repository-security-advisories';
import { listRepositorySecurityAdvisories } from './tools/list-repository-security-advisories';
import { listSecretScanningAlerts } from './tools/list-secret-scanning-alerts';

const securityTools = [
  getCodeScanningAlert,
  listCodeScanningAlerts,
  getDependabotAlert,
  listDependabotAlerts,
  getSecretScanningAlert,
  listSecretScanningAlerts,
  listRepositorySecurityAdvisories,
  listOrgRepositorySecurityAdvisories,
  getCodeQualityFinding
];

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

describe('GitHub synced security tool schemas', () => {
  it('keeps every tool MCP-compatible and every production ID below 60 characters', () => {
    for (const tool of securityTools) {
      expectMcpCompatibleToolSchema(tool);
      expect(`github-${tool.key}`.length).toBeLessThan(60);
    }
  });

  it('matches the official single-alert and code-quality input contracts', () => {
    for (const tool of [getCodeScanningAlert, getDependabotAlert, getSecretScanningAlert]) {
      let input = schema(tool);
      expect(Object.keys(input.properties)).toEqual(['owner', 'repo', 'alertNumber']);
      expect(input.required).toEqual(['owner', 'repo', 'alertNumber']);
    }

    let quality = schema(getCodeQualityFinding);
    expect(Object.keys(quality.properties)).toEqual(['owner', 'repo', 'findingNumber']);
    expect(quality.required).toEqual(['owner', 'repo', 'findingNumber']);
  });

  it('matches the official alert listing contracts', () => {
    let code = schema(listCodeScanningAlerts);
    expect(Object.keys(code.properties)).toEqual([
      'owner',
      'repo',
      'state',
      'ref',
      'severity',
      'tool_name',
      'perPage',
      'page'
    ]);
    expect(code.required).toEqual(['owner', 'repo']);
    expect(code.properties.state).toMatchObject({
      enum: ['closed', 'dismissed', 'fixed', 'open'],
      default: 'open'
    });
    expect(code.properties.severity.enum).toEqual([
      'critical',
      'error',
      'high',
      'low',
      'medium',
      'note',
      'warning'
    ]);

    let dependabot = schema(listDependabotAlerts);
    expect(Object.keys(dependabot.properties)).toEqual([
      'owner',
      'repo',
      'state',
      'severity',
      'perPage',
      'after'
    ]);
    expect(dependabot.required).toEqual(['owner', 'repo']);
    expect(dependabot.properties.state).toMatchObject({
      enum: ['auto_dismissed', 'dismissed', 'fixed', 'open'],
      default: 'open'
    });
    expect(dependabot.properties).not.toHaveProperty('page');

    let secret = schema(listSecretScanningAlerts);
    expect(Object.keys(secret.properties)).toEqual([
      'owner',
      'repo',
      'state',
      'secret_type',
      'resolution',
      'perPage',
      'page'
    ]);
    expect(secret.required).toEqual(['owner', 'repo']);
    expect(secret.properties.resolution.enum).toEqual([
      'false_positive',
      'pattern_deleted',
      'pattern_edited',
      'revoked',
      'used_in_tests',
      'wont_fix'
    ]);
  });

  it('matches the official repository advisory contracts', () => {
    let repository = schema(listRepositorySecurityAdvisories);
    expect(Object.keys(repository.properties)).toEqual([
      'owner',
      'repo',
      'direction',
      'sort',
      'state'
    ]);
    expect(repository.required).toEqual(['owner', 'repo']);

    let organization = schema(listOrgRepositorySecurityAdvisories);
    expect(Object.keys(organization.properties)).toEqual([
      'org',
      'direction',
      'sort',
      'state'
    ]);
    expect(organization.required).toEqual(['org']);

    for (const input of [repository, organization]) {
      expect(input.properties.direction.enum).toEqual(['asc', 'desc']);
      expect(input.properties.sort.enum).toEqual(['created', 'published', 'updated']);
      expect(input.properties.state.enum).toEqual(['closed', 'draft', 'published', 'triage']);
    }
  });
});

describe('GitHub synced security requests', () => {
  it('routes every security operation through the ServiceError-compatible REST foundation', async () => {
    let requestRest = vi.spyOn(GitHubClient.prototype, 'requestRest').mockResolvedValue([]);
    let requestRestWithMetadata = vi
      .spyOn(GitHubClient.prototype, 'requestRestWithMetadata')
      .mockResolvedValue({ data: [], linkHeader: undefined });
    let api = new GitHubSecurityApi({
      token: 'test-token',
      instanceUrl: 'https://github.com'
    });

    await api.getCodeScanningAlert('octo cat', 'hello/world', 1);
    await api.listCodeScanningAlerts('octocat', 'hello-world', {
      state: 'open',
      toolName: 'CodeQL',
      page: 2,
      perPage: 50
    });
    await api.getDependabotAlert('octocat', 'hello-world', 2);
    await api.listDependabotAlerts('octocat', 'hello-world', {
      severity: 'high',
      after: 'cursor',
      perPage: 25
    });
    await api.getSecretScanningAlert('octocat', 'hello-world', 3);
    await api.listSecretScanningAlerts('octocat', 'hello-world', {
      secretType: 'github_personal_access_token',
      page: 3,
      perPage: 10
    });
    await api.listRepositorySecurityAdvisories('octocat', 'hello-world', {
      state: 'triage'
    });
    await api.listOrganizationRepositorySecurityAdvisories('octo org', {
      sort: 'updated'
    });
    await api.getCodeQualityFinding('octocat', 'hello-world', 4);

    expect(requestRest).toHaveBeenCalledTimes(8);
    expect(requestRestWithMetadata).toHaveBeenCalledTimes(1);
    expect(requestRest.mock.calls[0]?.[0]).toMatchObject({
      method: 'GET',
      path: '/repos/octo%20cat/hello%2Fworld/code-scanning/alerts/1',
      reason: 'github_get_code_scanning_alert_failed'
    });
    expect(requestRest.mock.calls[1]?.[0]).toMatchObject({
      path: '/repos/octocat/hello-world/code-scanning/alerts',
      query: { state: 'open', tool_name: 'CodeQL', page: 2, per_page: 50 }
    });
    expect(requestRestWithMetadata.mock.calls[0]?.[0]).toMatchObject({
      path: '/repos/octocat/hello-world/dependabot/alerts',
      query: { severity: 'high', after: 'cursor', per_page: 25 }
    });
    expect(requestRest.mock.calls[4]?.[0]).toMatchObject({
      path: '/repos/octocat/hello-world/secret-scanning/alerts',
      query: {
        secret_type: 'github_personal_access_token',
        page: 3,
        per_page: 10
      }
    });
    expect(requestRest.mock.calls[6]?.[0]).toMatchObject({
      path: '/orgs/octo%20org/security-advisories',
      query: { sort: 'updated' }
    });
    expect(requestRest.mock.calls[7]?.[0]).toMatchObject({
      path: '/repos/octocat/hello-world/code-quality/findings/4',
      reason: 'github_get_code_quality_finding_failed'
    });
  });

  it('returns Dependabot cursors from GitHub Link metadata', async () => {
    vi.spyOn(GitHubClient.prototype, 'requestRestWithMetadata').mockResolvedValue({
      data: [{ number: 17, state: 'open' }],
      linkHeader:
        '<https://api.github.com/repositories/1/dependabot/alerts?before=prev-1>; rel="prev", <https://api.github.com/repositories/1/dependabot/alerts?after=next-2>; rel="next"'
    });

    let result = await invoke(listDependabotAlerts, {
      owner: 'octocat',
      repo: 'hello-world',
      state: 'open'
    });

    expect(result.output).toEqual({
      repository: 'octocat/hello-world',
      alerts: [{ number: 17, state: 'open' }],
      returnedCount: 1,
      pageInfo: {
        hasNextPage: true,
        hasPreviousPage: true,
        nextCursor: 'next-2',
        prevCursor: 'prev-1'
      }
    });
  });

  it('returns stable repository metadata and raw provider alert details', async () => {
    vi.spyOn(GitHubSecurityApi.prototype, 'listCodeScanningAlerts').mockResolvedValue([
      { number: 17, state: 'open', rule: { severity: 'high' } }
    ]);

    let result = await invoke(listCodeScanningAlerts, {
      owner: 'octocat',
      repo: 'hello-world',
      state: 'open'
    });

    expect(result.output).toEqual({
      repository: 'octocat/hello-world',
      alerts: [{ number: 17, state: 'open', rule: { severity: 'high' } }],
      returnedCount: 1
    });
  });
});
