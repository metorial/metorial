import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

const legacy = [
  'create_address',
  'validate_address',
  'list_addresses',
  'create_shipment',
  'get_shipment',
  'get_rates',
  'purchase_label',
  'get_transaction',
  'list_transactions',
  'track_shipment',
  'register_tracking',
  'create_customs_declaration',
  'create_order',
  'list_orders',
  'list_carrier_accounts',
  'create_manifest',
  'schedule_pickup',
  'create_refund',
  'create_parcel_template',
  'list_parcel_templates',
  'create_batch',
  'purchase_batch'
];
describeMcpCompatibleToolSchemas('Shippo tool inputs', provider.actions);
const action = (key: string) => {
  const found = provider.actions.find(a => a.key === key);
  if (!found) throw new Error('Missing contract action');
  return found;
};
describe('Shippo compatibility contracts', () => {
  it('retains all 22 keys and only three approved additions', () => {
    expect(provider.actions.map(a => a.key).sort()).toEqual(
      [...legacy, 'get_current_context', 'get_shipping_resource', 'download_document'].sort()
    );
    expect(provider.actions.every(a => `shippo-${a.key}`.length < 60)).toBe(true);
  });
  it('preserves rate and single-call label branches', () => {
    expect(
      action('purchase_label').inputSchema.safeParse({
        rateId: '0123',
        labelFileType: 'ZPLII'
      }).success
    ).toBe(true);
    expect(
      action('purchase_label').inputSchema.safeParse({
        shipment: { addressFrom: '0123', addressTo: { country: 'US' }, parcels: ['parcel1'] },
        carrierAccount: 'carrier1',
        servicelevelToken: 'usps_priority'
      }).success
    ).toBe(true);
  });
  it('supports both custom and documented carrier templates', () => {
    expect(
      action('create_parcel_template').inputSchema.safeParse({
        name: 'Box',
        length: '10',
        width: '8',
        height: '6',
        distanceUnit: 'in',
        weight: '0.4',
        massUnit: 'lb'
      }).success
    ).toBe(true);
    expect(
      action('create_parcel_template').inputSchema.safeParse({
        template: 'USPS_FlatRateEnvelope',
        weight: '1',
        massUnit: 'lb'
      }).success
    ).toBe(true);
  });
  it('preserves legacy customs enums and adds documented values', () => {
    for (const incoterm of [
      'DDP',
      'DDU',
      'FCA',
      'DAP',
      'CPT',
      'CIP',
      'CIF',
      'FOB',
      'EXW',
      'eDAP'
    ])
      expect(
        action('create_customs_declaration').inputSchema.safeParse({
          contentsType: 'OTHER',
          certify: true,
          certifySigner: 'Test',
          incoterm,
          items: []
        }).success
      ).toBe(true);
  });
  it('preserves string references, dates and continuation input types', () => {
    expect(
      action('create_manifest').inputSchema.safeParse({
        carrierAccount: '00123',
        shipmentDate: '2026-10-06',
        addressFrom: '00124'
      }).success
    ).toBe(true);
    expect(
      action('create_batch').inputSchema.safeParse({
        defaultCarrierAccount: '00123',
        defaultServicelevelToken: 'usps_priority',
        batchShipments: [{ shipmentId: '00124' }]
      }).success
    ).toBe(true);
    for (const key of [
      'list_addresses',
      'list_orders',
      'list_transactions',
      'list_carrier_accounts'
    ])
      expect(
        action(key).inputSchema.safeParse({
          nextPage: 'https://api.goshippo.com/orders?page=opaque'
        }).success
      ).toBe(true);
  });
});
