import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, test } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import { articleSchema, money, pageSchema, salesSchema, voucherSchema } from './lib/schemas';

describeMcpCompatibleToolSchemas('Lexoffice tool input schemas', provider.actions);
const legacy = {
  create_contact: [
    'roles',
    'company',
    'person',
    'note',
    'addresses',
    'emailAddresses',
    'phoneNumbers'
  ],
  get_contact: ['contactId'],
  update_contact: [
    'contactId',
    'version',
    'roles',
    'company',
    'person',
    'note',
    'addresses',
    'emailAddresses',
    'phoneNumbers'
  ],
  list_contacts: ['email', 'name', 'number', 'customer', 'vendor', 'page'],
  create_invoice: [
    'address',
    'lineItems',
    'totalPrice',
    'taxConditions',
    'paymentConditions',
    'shippingConditions',
    'title',
    'introduction',
    'remark',
    'voucherDate',
    'finalize',
    'precedingSalesVoucherId'
  ],
  get_invoice: ['invoiceId'],
  create_quotation: [
    'address',
    'lineItems',
    'totalPrice',
    'taxConditions',
    'paymentConditions',
    'shippingConditions',
    'title',
    'introduction',
    'remark',
    'voucherDate',
    'expirationDate',
    'finalize'
  ],
  create_credit_note: [
    'address',
    'lineItems',
    'totalPrice',
    'taxConditions',
    'title',
    'introduction',
    'remark',
    'voucherDate',
    'finalize',
    'precedingSalesVoucherId'
  ],
  create_order_confirmation: [
    'address',
    'lineItems',
    'totalPrice',
    'taxConditions',
    'paymentConditions',
    'shippingConditions',
    'title',
    'introduction',
    'remark',
    'voucherDate',
    'finalize',
    'precedingSalesVoucherId'
  ],
  manage_article: [
    'action',
    'articleId',
    'title',
    'description',
    'type',
    'articleNumber',
    'gtin',
    'note',
    'unitName',
    'price'
  ],
  list_articles: ['articleNumber', 'gtin', 'type', 'page'],
  manage_voucher: [
    'action',
    'voucherId',
    'type',
    'voucherNumber',
    'voucherDate',
    'dueDate',
    'totalGrossAmount',
    'totalTaxAmount',
    'taxType',
    'voucherItems',
    'contactId',
    'voucherStatus'
  ],
  list_vouchers: [
    'voucherType',
    'voucherStatus',
    'voucherDateFrom',
    'voucherDateTo',
    'createdDateFrom',
    'createdDateTo',
    'updatedDateFrom',
    'updatedDateTo',
    'contactId',
    'voucherNumber',
    'page',
    'size',
    'sort'
  ],
  get_payment: ['paymentId'],
  get_profile: []
};
const required: Record<string, string[]> = {
  create_contact: ['roles'],
  get_contact: ['contactId'],
  update_contact: ['contactId', 'version', 'roles'],
  create_invoice: ['address', 'lineItems', 'taxConditions'],
  get_invoice: ['invoiceId'],
  create_quotation: ['address', 'lineItems', 'taxConditions'],
  create_credit_note: ['address', 'lineItems', 'taxConditions'],
  create_order_confirmation: ['address', 'lineItems', 'taxConditions'],
  manage_article: ['action'],
  manage_voucher: ['action'],
  get_payment: ['paymentId']
};
for (const [key, fields] of Object.entries(legacy))
  test(`preserves ${key} fields and requiredness`, () => {
    const action = provider.actions.find(v => v.key === key);
    expect(action).toBeDefined();
    const schema = z.toJSONSchema(action!.inputSchema);
    expect(Object.keys(schema.properties ?? {})).toEqual(expect.arrayContaining(fields));
    expect([...(schema.required ?? [])].sort()).toEqual([...(required[key] ?? [])].sort());
  });
test('preserves legacy enums and article tax-rate string input', () => {
  const article = provider.actions.find(v => v.key === 'manage_article')!;
  const schema = z.toJSONSchema(article.inputSchema, { io: 'input' });
  expect(schema.properties?.action).toMatchObject({
    enum: ['create', 'get', 'update', 'delete']
  });
  expect(schema.properties?.type).toMatchObject({ enum: ['product', 'service'] });
  expect(
    article.inputSchema.parse({ action: 'create', price: { taxRatePercentage: '19' } })
  ).toMatchObject({ price: { taxRatePercentage: '19' } });
  expect(
    provider.actions
      .find(v => v.key === 'manage_voucher')!
      .inputSchema.safeParse({ action: 'create', voucherStatus: 'paid' }).success
  ).toBe(true);
});
test('registers exactly eighteen short public tool keys and no triggers', () => {
  expect(provider.actions).toHaveLength(18);
  expect(new Set(provider.actions.map(v => v.key)).size).toBe(18);
  for (const action of provider.actions) {
    expect(action.type).toBe('tool');
    expect(`lexoffice-${action.key}`.length).toBeLessThan(60);
  }
});
test('money schemas reject unsafe values without rounding', () => {
  for (const value of [0, -1, 0.01, 13.4, 90071992547409.9])
    expect(money.safeParse(value).success).toBe(true);
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, 0.001, 90071992547409.92])
    expect(money.safeParse(value).success).toBe(false);
  expect(
    salesSchema.safeParse({ id: 'invoice', totalPrice: { totalGrossAmount: 0.001 } }).success
  ).toBe(false);
  expect(
    voucherSchema.safeParse({
      id: 'voucher',
      version: 0,
      type: 'salesinvoice',
      taxType: 'gross',
      totalTaxAmount: 0.001
    }).success
  ).toBe(false);
});
test('page schemas require actual continuation metadata and explicit content', () => {
  const schema = pageSchema(z.object({ id: z.string() }));
  expect(schema.safeParse({ content: [] }).success).toBe(false);
  expect(
    schema.safeParse({
      content: [],
      first: true,
      last: true,
      totalPages: 0,
      totalElements: 0,
      numberOfElements: 0,
      size: 25,
      number: 0
    }).success
  ).toBe(true);
});
test('article response contract follows current uppercase enums and taxRate', () => {
  expect(
    articleSchema.safeParse({
      id: 'article',
      version: 0,
      title: 'Synthetic',
      type: 'PRODUCT',
      unitName: 'unit',
      price: { netPrice: 1, taxRate: 19, leadingPrice: 'NET' }
    }).success
  ).toBe(true);
  expect(
    articleSchema.safeParse({
      id: 'article',
      version: 0,
      title: 'Synthetic',
      type: 'product',
      unitName: 'unit',
      price: { netPrice: 1, taxRatePercentage: 19, leadingPrice: 'net' }
    }).success
  ).toBe(false);
});
