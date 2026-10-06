import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { auth } from './auth';
import { provider } from './index';
import { XataCoreClient, XataWorkspaceClient } from './lib/client';

describeMcpCompatibleToolSchemas('Xata tool schemas', provider.actions);
describe('Xata Lite retirement contracts', () => {
  const tools = provider.actions.filter(tool => tool.type === 'tool');
  const retired = tools.filter(tool => tool.tags?.deprecated);
  it('preserves all twenty-four retired tools and adds only the current core surface', () => {
    expect(retired).toHaveLength(24);
    expect(provider.actions).toHaveLength(32);
    for (const key of [
      'list_organizations',
      'list_projects',
      'get_project',
      'list_project_branches',
      'get_project_branch',
      'create_project_branch',
      'update_project_branch',
      'delete_project_branch'
    ]) {
      const tool = provider.actions.find(tool => tool.key === key);
      expect(tool).toBeDefined();
      expect(tool?.tags?.deprecated).not.toBe(true);
    }
    for (const tool of provider.actions) expect(`xata-${tool.key}`.length).toBeLessThan(60);
  });
  for (const tool of retired)
    it(`${tool.key} retains explicit remediation and rejects before retired transport`, async () => {
      expect(tool.description).toMatch(/^DEPRECATED — Xata Lite/);
      expect(tool.instructions?.join(' ')).toContain('list_organizations');
      await expect(
        tool.handleInvocation({
          auth: { token: 'retirement-contract-no-credential' },
          config: { workspaceId: 'retired-contract', region: 'us-east-1', branch: 'main' },
          input: {}
        } as Parameters<typeof tool.handleInvocation>[0])
      ).rejects.toThrow(/Xata Lite was permanently retired on February 28, 2026/);
    });
  it('retains both retired clients as local pre-transport failures', () => {
    expect(() => new XataCoreClient({ token: 'retirement-contract-no-credential' })).toThrow(
      /Xata Lite was permanently retired on February 28, 2026/
    );
    expect(
      () =>
        new XataWorkspaceClient({
          token: 'retirement-contract-no-credential',
          workspaceId: 'retired-contract',
          region: 'us-east-1'
        })
    ).toThrow(/Xata Lite was permanently retired on February 28, 2026/);
  });
  it('keeps the retired OAuth key and rejects every historical entry point locally', async () => {
    const oauth = auth.authStack.find(method => method.key === 'oauth');
    expect(oauth?.type).toBe('auth.oauth');
    if (!oauth || oauth.type !== 'auth.oauth')
      throw new Error('Missing retired OAuth contract');
    expect(oauth.scopes.map(scope => scope.scope)).toContain('admin:all');
    for (const handler of [
      oauth.getAuthorizationUrl,
      oauth.handleCallback,
      oauth.handleTokenRefresh,
      oauth.getProfile
    ]) {
      expect(handler).toBeDefined();
      if (!handler) throw new Error('Missing retired OAuth handler');
      // Missing context must still fail at the retirement boundary, before input or transport.
      await expect(handler({} as never)).rejects.toThrow(
        /Xata Lite was permanently retired on February 28, 2026/
      );
    }
  });
});
