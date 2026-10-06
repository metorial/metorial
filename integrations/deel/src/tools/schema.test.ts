import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

describeMcpCompatibleToolSchemas('Deel input schemas', provider.actions);
let legacyKeys = [
  'list_contracts',
  'get_contract',
  'create_contract',
  'manage_contract',
  'list_people',
  'get_person',
  'manage_timesheets',
  'manage_time_off',
  'manage_invoice_adjustments',
  'list_invoices',
  'list_payments',
  'list_organization_data',
  'get_eor_country_guide',
  'calculate_eor_cost'
];
describe('Deel public contracts', () => {
  it('retains every legacy key and only the approved additions', () => {
    let keys = provider.actions.map(action => action.key);
    for (let key of legacyKeys) expect(keys).toContain(key);
    expect(keys.filter(key => key !== 'metorial$getFileUrl')).toHaveLength(17);
    expect(keys).toContain('metorial$getFileUrl');
    expect(keys).toContain('get_current_user');
    expect(keys).toContain('get_current_organization');
    expect(keys).toContain('download_invoice');
  });
  it('keeps production identifiers below sixty characters', () => {
    for (let action of provider.actions) expect(`deel-${action.key}`.length).toBeLessThan(60);
  });
  it('retains legacy branch values and adds the documented lifecycle/discovery branches', () => {
    for (let key of ['manage_timesheets', 'manage_invoice_adjustments']) {
      let action = provider.actions.find(action => action.key === key)!;
      for (let branch of ['list', 'create', 'review', 'get', 'delete'])
        expect(action.inputSchema.safeParse({ action: branch }).success).toBe(true);
    }
    let timeOff = provider.actions.find(action => action.key === 'manage_time_off')!;
    for (let branch of ['list', 'create', 'update', 'delete', 'policies'])
      expect(timeOff.inputSchema.safeParse({ action: branch }).success).toBe(true);
  });
  it('does not make the legacy optional action inputs required in the schema', () => {
    let contracts = provider.actions.find(action => action.key === 'manage_contract')!;
    for (let action of ['amend', 'sign', 'terminate'])
      expect(
        contracts.inputSchema.safeParse({ contractId: 'contract-1', action }).success
      ).toBe(true);
    let create = provider.actions.find(action => action.key === 'create_contract')!;
    expect(
      create.inputSchema.safeParse({
        type: 'payg_task',
        title: 'Example',
        workerEmail: 'person@example.invalid',
        workerFirstName: 'Example',
        workerLastName: 'Person',
        startDate: '2026-10-01'
      }).success
    ).toBe(true);
  });
  it('keeps legacy numeric amount and pagination fields numeric', () => {
    for (let key of ['list_contracts', 'list_people', 'list_invoices', 'list_payments']) {
      let tool = provider.actions.find(action => action.key === key)!;
      expect(tool.inputSchema.safeParse({ limit: 1, offset: 0 }).success).toBe(true);
      expect(tool.inputSchema.safeParse({ limit: '1' }).success).toBe(false);
    }
  });
});
