import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';

describeMcpCompatibleToolSchemas('UniMicro tool input schemas', provider.actions);

let readOnlyToolIds = [
  'list_companies',
  'list_customers',
  'get_customer',
  'list_suppliers',
  'list_customer_invoices',
  'get_customer_invoice',
  'list_supplier_invoices',
  'get_supplier_invoice',
  'list_products',
  'list_accounts',
  'list_journal_entries',
  'list_projects',
  'get_profit_and_loss',
  'get_balance_sheet',
  'get_trial_balance',
  'download_file'
];

describe('UniMicro tool metadata', () => {
  it('marks first-wave tools read-only and non-destructive', () => {
    expect(provider.actions.map(action => action.key).sort()).toEqual(readOnlyToolIds.sort());

    for (let action of provider.actions) {
      expect(action.parameters.tags?.readOnly ?? false, `${action.key} readOnly`).toBe(true);
      expect(action.parameters.tags?.destructive ?? false, `${action.key} destructive`).toBe(
        false
      );
    }
  });

  it('matches the documented SumAllYears query parameter type', () => {
    let action = provider.actions.find(child => child.key === 'get_profit_and_loss');
    let inputSchema = z.toJSONSchema(action?.inputSchema ?? z.object({})) as {
      properties?: Record<string, { type?: string }>;
    };

    expect(inputSchema.properties?.sumAllYears?.type).toBe('string');
  });
});
