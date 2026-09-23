import { googleIdentityActionScopes } from '@slates/google-identity-recipes';
import {
  createLocalSlateTestClient,
  describeMcpCompatibleToolSchemas,
  expectSlateContract
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import { bigQueryActionScopes } from './scopes';
import { spec } from './spec';

// Recipe consumers require declaration contracts; live E2E proves provider behavior.
const tools = provider.actions.filter(action => action.type === 'tool');
describeMcpCompatibleToolSchemas('BigQuery inputs', provider.actions);
describe('BigQuery recipe and scope contract', () => {
  it('preserves all 28 data tools and adds only the OAuth identity tool', () => {
    expect(tools.map(tool => tool.key).sort()).toEqual(
      [
        'cancel_job',
        'copy_table',
        'create_dataset',
        'create_routine',
        'create_table',
        'delete_dataset',
        'delete_model',
        'delete_routine',
        'delete_table',
        'execute_query',
        'execute_sql_readonly',
        'export_data',
        'get_current_user',
        'get_dataset',
        'get_job',
        'get_model',
        'get_routine',
        'get_table',
        'insert_rows',
        'list_datasets',
        'list_jobs',
        'list_models',
        'list_routines',
        'list_tables',
        'load_data',
        'read_table_data',
        'update_dataset',
        'update_model',
        'update_table'
      ].sort()
    );
    const identity = tools.find(tool => tool.key === 'get_current_user');
    expect(identity?.authMethods).toEqual(['google_oauth']);
    expect(identity?.scopes).toEqual(googleIdentityActionScopes);
    expect(identity?.tags).toMatchObject({ readOnly: true, destructive: false });
    expect(spec.configSchema.safeParse({}).success).toBe(true);
    expect(z.toJSONSchema(spec.configSchema).required ?? []).not.toContain('projectId');
  });

  it('requires endpoint-supported grants on every existing data tool', () => {
    const reads = new Set([
      'get_dataset',
      'get_job',
      'get_model',
      'get_routine',
      'get_table',
      'list_datasets',
      'list_jobs',
      'list_models',
      'list_routines',
      'list_tables',
      'read_table_data'
    ]);
    for (const tool of tools) {
      expect(`bigquery-${tool.key}`.length).toBeLessThan(60);
      if (tool.key === 'get_current_user') continue;
      expect(tool.authMethods).toBeUndefined();
      expect(tool.scopes).toEqual(
        tool.key === 'insert_rows'
          ? bigQueryActionScopes.insertRows
          : reads.has(tool.key)
            ? bigQueryActionScopes.read
            : bigQueryActionScopes.write
      );
    }
  });
});

describe('bigquery provider contract', () => {
  it('exposes the expected provider, tool, trigger, and auth surface', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'bigquery',
        name: 'BigQuery'
      },
      toolIds: [
        'get_current_user',
        'execute_query',
        'execute_sql_readonly',
        'list_datasets',
        'get_dataset',
        'create_dataset',
        'update_dataset',
        'delete_dataset',
        'list_tables',
        'get_table',
        'create_table',
        'update_table',
        'delete_table',
        'load_data',
        'export_data',
        'list_jobs',
        'get_job',
        'cancel_job',
        'read_table_data',
        'insert_rows',
        'copy_table',
        'list_models',
        'get_model',
        'update_model',
        'delete_model',
        'list_routines',
        'get_routine',
        'create_routine',
        'delete_routine'
      ],
      triggerIds: ['inbound_webhook', 'job_completed', 'dataset_changed'],
      authMethodIds: ['google_oauth', 'service_account'],
      tools: [
        {
          id: 'execute_sql_readonly',
          readOnly: true,
          destructive: false
        }
      ],
      triggers: [
        { id: 'inbound_webhook', invocationType: 'webhook' },
        { id: 'job_completed', invocationType: 'polling' },
        { id: 'dataset_changed', invocationType: 'polling' }
      ]
    });

    expect(contract.actions).toHaveLength(32);
    expect(Object.keys(contract.configSchema.properties ?? {})).toEqual([
      'projectId',
      'location'
    ]);

    let oauth = await client.getAuthMethod('google_oauth');
    expect(oauth.authenticationMethod.type).toBe('auth.oauth');
    expect(oauth.authenticationMethod.capabilities.handleTokenRefresh?.enabled).toBe(true);
    expect(oauth.authenticationMethod.capabilities.getProfile?.enabled).toBe(true);

    let scopeTitles = new Set(
      (oauth.authenticationMethod.scopes ?? []).map(scope => scope.title)
    );
    expect(scopeTitles.has('BigQuery Full Access')).toBe(true);
    expect(oauth.authenticationMethod.scopes).toHaveLength(3);
    expect(scopeTitles.has('Google Account Email')).toBe(true);
    expect(scopeTitles.has('Google Account Profile')).toBe(true);

    let serviceAccount = await client.getAuthMethod('service_account');
    expect(serviceAccount.authenticationMethod.type).toBe('auth.custom');
  });
});
