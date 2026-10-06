import {
  describeMcpCompatibleToolSchemas,
  getMcpCompatibleToolSchemaCases
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

const cases = getMcpCompatibleToolSchemaCases(provider);
describeMcpCompatibleToolSchemas('Appsmith tool schemas', provider);
const legacy: Record<string, Record<string, unknown>> = {
  check_health: {},
  get_instance_info: {},
  trigger_workflow: {
    webhookUrl: 'https://instance.example/native?apiKey=example',
    payload: {}
  },
  list_workspaces: {},
  manage_workspace: { action: 'update', workspaceId: 'workspace', name: '', website: '' },
  list_applications: { workspaceId: 'workspace' },
  manage_application: {
    action: 'update',
    applicationId: 'application',
    name: '',
    isPublic: false,
    color: '',
    icon: ''
  },
  export_application: { applicationId: 'application' },
  import_application: { workspaceId: 'workspace', applicationJson: {} },
  list_pages: { applicationId: 'application' },
  list_datasources: { workspaceId: 'workspace' },
  query_audit_logs: { resourceType: '', event: '', userId: '', limit: 1, sortOrder: 'ASC' },
  get_current_user: {}
};
describe('Appsmith retained contracts', () => {
  it('retains exactly thirteen public keys', () =>
    expect(cases.map(([key]) => key).sort()).toEqual(Object.keys(legacy).sort()));
  for (const [key, input] of Object.entries(legacy)) {
    it(`${key} preserves legacy input field types`, () =>
      expect(
        cases.find(([name]) => name === key)?.[1].inputSchema.safeParse(input).success
      ).toBe(true));
    it(`${key} has a short production ID`, () =>
      expect(`appsmith-${key}`.length).toBeLessThan(60));
  }
  for (const action of ['create', 'update', 'delete', 'get', 'get_members'])
    it(`retains workspace action ${action}`, () =>
      expect(
        cases
          .find(([key]) => key === 'manage_workspace')?.[1]
          .inputSchema.safeParse({ action }).success
      ).toBe(true));
  for (const action of ['create', 'update', 'delete', 'publish', 'clone', 'fork', 'get'])
    it(`retains or adds application action ${action}`, () =>
      expect(
        cases
          .find(([key]) => key === 'manage_application')?.[1]
          .inputSchema.safeParse({ action }).success
      ).toBe(true));
  it('marks the historical audit route deprecated with dashboard remediation', () => {
    const action = provider.actions.find(action => action.key === 'query_audit_logs');
    expect(action?.tags).toMatchObject({ deprecated: true, readOnly: true });
    expect(action?.description).toContain('DEPRECATED');
  });
  it('retains the legacy export output field as optional', () => {
    const tool = provider.actions.find(action => action.key === 'export_application');
    expect(
      tool?.outputSchema.safeParse({ applicationJson: {}, applicationName: 'Application' })
        .success
    ).toBe(true);
    expect(
      tool?.outputSchema.safeParse({ filename: 'application.json', size: 1 }).success
    ).toBe(true);
  });
  it('does not register triggers', () =>
    expect(
      provider.actions.filter(action => String(action.type).includes('trigger'))
    ).toHaveLength(0));
});
