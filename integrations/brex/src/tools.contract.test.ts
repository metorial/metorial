import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, test } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import {
  accountDto,
  budgetDto,
  cardDto,
  expenseDto,
  transactionDto,
  transferDto
} from './lib/schemas';

describeMcpCompatibleToolSchemas('Brex tool input schemas', provider.actions);
const legacyFields = {
  manage_card: [
    'cardId',
    'action',
    'reason',
    'ownerUserId',
    'cardName',
    'cardType',
    'spendLimit',
    'spendDuration',
    'lockAfterDate',
    'mailingAddress'
  ],
  list_transfers: ['cursor', 'limit'],
  list_departments_locations: ['resourceType', 'cursor', 'limit'],
  list_budgets: ['cursor', 'limit'],
  list_accounts: ['accountType'],
  list_expenses: ['updatedAtStart', 'expand', 'cursor', 'limit'],
  manage_user: [
    'userId',
    'firstName',
    'lastName',
    'email',
    'managerId',
    'departmentId',
    'locationId',
    'monthlySpendLimit'
  ],
  list_users: ['email', 'cursor', 'limit'],
  manage_vendor: [
    'vendorId',
    'deleteVendor',
    'companyName',
    'email',
    'phone',
    'paymentAccountId',
    'idempotencyKey'
  ],
  list_vendors: ['cursor', 'limit'],
  update_expense: ['expenseId', 'memo', 'category'],
  create_transfer: [
    'amount',
    'counterpartyType',
    'paymentInstrumentId',
    'description',
    'externalMemo',
    'originatingAccountId',
    'approvalType',
    'idempotencyKey'
  ],
  list_transactions: [
    'source',
    'cashAccountId',
    'userIds',
    'postedAtStart',
    'cursor',
    'limit'
  ],
  list_cards: ['userId', 'cursor', 'limit'],
  manage_budget: [
    'budgetId',
    'archive',
    'name',
    'description',
    'parentBudgetId',
    'ownerUserIds',
    'memberUserIds',
    'periodType',
    'limit',
    'startDate',
    'endDate'
  ]
};
const required: Record<string, string[]> = {
  create_transfer: ['amount', 'counterpartyType', 'paymentInstrumentId', 'description'],
  list_transactions: ['source'],
  update_expense: ['expenseId']
};
for (const [key, fields] of Object.entries(legacyFields))
  test(`preserves ${key} input properties and requiredness`, () => {
    const action = provider.actions.find(v => v.key === key);
    expect(action).toBeDefined();
    const schema = z.toJSONSchema(action!.inputSchema);
    expect(schema.type).toBe('object');
    expect(Object.keys(schema.properties ?? {})).toEqual(expect.arrayContaining(fields));
    expect([...(schema.required ?? [])].sort()).toEqual([...(required[key] ?? [])].sort());
  });
test('preserves legacy enums and marks unsupported legacy properties explicitly', () => {
  const schemas = Object.fromEntries(
    provider.actions.map(v => [v.key, z.toJSONSchema(v.inputSchema)])
  );
  const property = (key: string, field: string) => schemas[key]!.properties![field];
  expect(property('create_transfer', 'counterpartyType')).toMatchObject({
    enum: ['VENDOR', 'BREX_CASH']
  });
  expect(property('manage_card', 'spendDuration')).toMatchObject({
    enum: ['MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME', 'TRANSACTION']
  });
  expect(property('manage_budget', 'periodType')).toMatchObject({
    enum: ['MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME']
  });
  for (const [key, field] of [
    ['manage_user', 'monthlySpendLimit'],
    ['manage_vendor', 'paymentAccountId'],
    ['update_expense', 'category']
  ])
    expect(property(key!, field!)).toMatchObject({ deprecated: true });
});
test('registers eighteen public tools and one reserved renewal action, without triggers', () => {
  const keys = provider.actions.map(v => v.key);
  expect(keys).toHaveLength(19);
  expect(new Set(keys).size).toBe(19);
  expect(keys).toEqual(
    expect.arrayContaining([
      'get_current_user',
      'get_resource',
      'download_expense_receipt',
      'metorial$getFileUrl'
    ])
  );
  for (const key of keys) expect(`brex-${key}`.length).toBeLessThan(60);
  expect(provider.actions.filter(v => v.type !== 'tool')).toHaveLength(0);
});

type WireMoney = { amount: number; currency?: string | null };
const moneyResponses = [
  [
    'card limit',
    cardDto,
    (value: WireMoney) => ({ id: 'card', spend_controls: { spend_limit: value } })
  ],
  [
    'expense original',
    expenseDto,
    (value: WireMoney) => ({ id: 'expense', original_amount: value })
  ],
  [
    'expense billing',
    expenseDto,
    (value: WireMoney) => ({ id: 'expense', billing_amount: value })
  ],
  ['transfer', transferDto, (value: WireMoney) => ({ id: 'transfer', amount: value })],
  ['budget', budgetDto, (value: WireMoney) => ({ budget_id: 'budget', amount: value })],
  [
    'spend limit',
    budgetDto,
    (value: WireMoney) => ({ id: 'limit', authorization_settings: { base_limit: value } })
  ],
  [
    'account current',
    accountDto,
    (value: WireMoney) => ({ id: 'account', current_balance: value })
  ],
  [
    'account available',
    accountDto,
    (value: WireMoney) => ({ id: 'account', available_balance: value })
  ],
  ['transaction', transactionDto, (value: WireMoney) => ({ id: 'transaction', amount: value })]
] as const;
test.each(
  moneyResponses
)('%s response money preserves signed safe integers and currency absence', (_, schema, wrap) => {
  for (const amount of [Number.MIN_SAFE_INTEGER, -1, 0, 1, Number.MAX_SAFE_INTEGER])
    for (const currency of [undefined, null, 'EUR']) {
      const result = schema.safeParse(wrap({ amount, currency }));
      expect(result.success).toBe(true);
      if (result.success)
        expect(result.data).toMatchObject(wrap({ amount, currency: currency ?? null }));
    }
  for (const amount of [
    Number.MIN_SAFE_INTEGER - 1,
    Number.MAX_SAFE_INTEGER + 1,
    0.5,
    Number.NaN,
    Number.POSITIVE_INFINITY
  ])
    expect(schema.safeParse(wrap({ amount, currency: 'USD' })).success).toBe(false);
});
