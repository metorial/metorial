import { createLocalSlateTestClient, expectSlateError } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from '../../index';
import { financeDataManagementPackageOperationInputSchema } from './data-management';

let createClient = () =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config: {},
      auth: {
        authenticationMethodId: 'microsoft_client_credentials',
        output: {
          finOpsToken: 'test-token',
          finOpsBaseUrl: 'https://contoso.operations.dynamics.com'
        }
      }
    }
  });

describe('run_data_management_package_operation', () => {
  it('exposes a finance-safe Data Management action schema', () => {
    let jsonSchema = z.toJSONSchema(
      financeDataManagementPackageOperationInputSchema
    ) as Record<string, unknown>;
    let properties = (jsonSchema.properties ?? {}) as Record<
      string,
      { enum?: string[] } | undefined
    >;
    let actionEnum = properties.action?.enum ?? [];

    expect(properties.confirmImport).toBeDefined();
    expect(actionEnum).toContain('import_from_package');
    expect(actionEnum).not.toContain('get_execution_summary_page_url');
    expect(actionEnum).not.toContain('get_import_staging_error_file_url');
  });

  it('rejects imports without explicit confirmation before calling Finance and Operations', async () => {
    let client = createClient();

    await expectSlateError(
      () =>
        client.invokeTool('finance_run_data_management_package_operation', {
          action: 'import_from_package',
          definitionGroupId: 'Vendors import',
          packageUrl: 'https://storage.example/package.zip'
        }),
      'import_from_package requires confirmImport=true'
    );
  });
});
