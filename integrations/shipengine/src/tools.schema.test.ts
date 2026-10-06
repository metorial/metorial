import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('ShipEngine input schemas', provider.actions);
const legacyKeys = [
  'validate_address',
  'recognize_address',
  'get_rates',
  'estimate_rates',
  'create_label',
  'void_label',
  'list_labels',
  'track_package',
  'create_shipment',
  'update_shipment',
  'cancel_shipment',
  'list_shipments',
  'list_carriers',
  'list_warehouses',
  'create_warehouse',
  'update_warehouse',
  'delete_warehouse',
  'find_service_points',
  'schedule_pickup',
  'cancel_pickup',
  'create_manifest'
];
describe('ShipEngine compatibility', () => {
  it('retains all21 legacy keys and only three approved additions', () => {
    const keys = provider.actions.map(action => action.key);
    for (const key of legacyKeys) expect(keys).toContain(key);
    expect(keys).toHaveLength(24);
    for (const key of [
      'get_shipping_resource',
      'list_shipping_resources',
      'download_shipping_document'
    ])
      expect(keys).toContain(key);
  });
  it('uses production IDs below60 characters', () => {
    for (const action of provider.actions)
      expect(`shipengine-${action.key}`.length).toBeLessThan(60);
  });
  it('retains legacy sort and radius enums without pretending unsupported values work', () => {
    const labels = provider.actions.find(action => action.key === 'list_labels');
    expect(labels?.inputSchema.safeParse({ sortBy: 'ship_date' }).success).toBe(true);
    const points = provider.actions.find(action => action.key === 'find_service_points');
    expect(
      points?.inputSchema.safeParse({ providers: [{ carrierId: 'se-1' }], radiusUnit: 'mi' })
        .success
    ).toBe(true);
  });
  it('keeps label source input object and legacy exact string IDs', () => {
    const tool = provider.actions.find(action => action.key === 'create_label');
    expect(tool?.inputSchema.safeParse({ rateId: 'se-123' }).success).toBe(true);
    expect(tool?.inputSchema.safeParse({ rateId: 123 }).success).toBe(false);
  });
  it('retains documented non-negative weight inputs', () => {
    const tool = provider.actions.find(action => action.key === 'estimate_rates');
    const input = {
      toCountryCode: 'US',
      toPostalCode: '78756',
      weight: { value: 0, unit: 'ounce' }
    };
    expect(tool?.inputSchema.safeParse(input).success).toBe(true);
    expect(
      tool?.inputSchema.safeParse({ ...input, weight: { value: -1, unit: 'ounce' } }).success
    ).toBe(false);
  });
  it('keeps numeric page inputs and optional legacy manifest carrier', () => {
    const tool = provider.actions.find(action => action.key === 'list_labels');
    expect(tool?.inputSchema.safeParse({ page: 1, pageSize: 1 }).success).toBe(true);
    expect(tool?.inputSchema.safeParse({ page: '1' }).success).toBe(false);
    expect(
      provider.actions
        .find(a => a.key === 'create_manifest')
        ?.inputSchema.safeParse({ labelIds: ['se-1'] }).success
    ).toBe(true);
  });
});
