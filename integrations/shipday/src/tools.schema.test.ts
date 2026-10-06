import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Shipday input schemas', provider.actions);
describe('Shipday legacy contracts', () => {
  it('retains exactly the eight approved keys', () => {
    expect(provider.actions.map(action => action.key).sort()).toEqual([
      'create_delivery_order',
      'delete_delivery_order',
      'get_delivery_orders',
      'manage_carriers',
      'manage_pickup_order',
      'on_demand_delivery',
      'track_delivery',
      'update_delivery_order'
    ]);
    for (const action of provider.actions)
      expect(`shipday-${action.key}`.length).toBeLessThan(60);
  });
  it('preserves legacy actions and documented additive identifiers', () => {
    const pickup = provider.actions.find(action => action.key === 'manage_pickup_order')!;
    for (const action of ['create', 'get', 'edit', 'delete'])
      expect(
        pickup.inputSchema.safeParse({ action, orderNumber: 'legacy', orderId: 1 }).success
      ).toBe(true);
    const carriers = provider.actions.find(action => action.key === 'manage_carriers')!;
    for (const action of ['list', 'add', 'delete'])
      expect(carriers.inputSchema.safeParse({ action }).success).toBe(true);
    const demand = provider.actions.find(action => action.key === 'on_demand_delivery')!;
    for (const action of ['services', 'estimate', 'assign', 'details', 'cancel'])
      expect(demand.inputSchema.safeParse({ action }).success).toBe(true);
  });
  it('keeps numeric IDs, old add-ons and native array add-ons', () => {
    const update = provider.actions.find(action => action.key === 'update_delivery_order')!;
    expect(update.inputSchema.safeParse({ orderId: '1' }).success).toBe(false);
    for (const addOns of ['Onion', ['Onion', 'Sauce']])
      expect(
        update.inputSchema.safeParse({
          orderId: 1,
          orderItems: [{ name: 'Item', quantity: 1, addOns }]
        }).success
      ).toBe(true);
  });
});
