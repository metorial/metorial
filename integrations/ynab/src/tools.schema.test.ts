import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('YNAB tool input schemas', provider.actions);

it('retains nineteen legacy keys and only the two approved additions', () => {
  const legacy = [
    'create_account',
    'create_transaction',
    'delete_transaction',
    'get_budget',
    'get_month',
    'get_transaction',
    'import_transactions',
    'list_accounts',
    'list_budgets',
    'list_categories',
    'list_months',
    'list_payees',
    'list_scheduled_transactions',
    'list_transactions',
    'manage_category',
    'manage_category_group',
    'manage_scheduled_transaction',
    'update_payee',
    'update_transaction'
  ];
  expect(provider.actions.map(action => action.key).sort()).toEqual(
    [...legacy, 'get_current_user', 'create_payee'].sort()
  );
});
