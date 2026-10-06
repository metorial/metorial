import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

const legacy = [
  'list_storefronts',
  'get_storefront',
  'list_products',
  'get_product',
  'list_purchases',
  'get_purchase',
  'reactivate_purchase',
  'list_customers',
  'get_customer',
  'list_subscribers',
  'get_subscriber',
  'verify_subscriber',
  'verify_notification'
];
describeMcpCompatibleToolSchemas('Digital Product Delivery input schemas', provider.actions);
describe('Preserved DPD contracts', () => {
  it('retains thirteen legacy keys and the approved API status addition', () => {
    expect(provider.actions.map(a => a.key).sort()).toEqual(
      [...legacy, 'get_api_status'].sort()
    );
    expect(provider.actions.every(a => `dpd2-${a.key}`.length < 60)).toBe(true);
  });
  it('retains optional verification locators and paging inputs in object schemas', () => {
    const tool = (key: string) => provider.actions.find(a => a.key === key)!;
    expect(tool('verify_subscriber').inputSchema.safeParse({ storefrontId: 1 }).success).toBe(
      true
    );
    expect(
      tool('verify_subscriber').inputSchema.safeParse({
        storefrontId: 1,
        subscriberId: 2,
        subscriberUsername: 'reader@example.invalid'
      }).success
    ).toBe(true);
    for (const key of [
      'list_storefronts',
      'list_products',
      'list_purchases',
      'list_customers'
    ])
      expect(tool(key).inputSchema.safeParse({ page: 2 }).success).toBe(true);
    expect(
      tool('list_subscribers').inputSchema.safeParse({ storefrontId: 1, page: 2 }).success
    ).toBe(true);
    expect(
      tool('verify_notification').inputSchema.safeParse({
        notificationParams: { verify_sign: 'signature', mc_gross: '1.00', empty: '' }
      }).success
    ).toBe(true);
  });
});
