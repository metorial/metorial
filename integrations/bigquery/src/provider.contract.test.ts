import { createLocalSlateTestClient, expectSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

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

    expect(contract.actions).toHaveLength(31);
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
    expect(scopeTitles.has('BigQuery Read Only')).toBe(true);
    expect(scopeTitles.has('Google Account Email')).toBe(true);
    expect(scopeTitles.has('Google Account Profile')).toBe(true);

    let serviceAccount = await client.getAuthMethod('service_account');
    expect(serviceAccount.authenticationMethod.type).toBe('auth.custom');
  });
});
