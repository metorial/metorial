import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

const keys = [
  'get_employee',
  'search_employees',
  'manage_employee',
  'get_job_info',
  'get_org_structure',
  'search_job_requisitions',
  'get_job_application',
  'manage_time_off',
  'get_time_accounts',
  'get_performance_reviews',
  'get_goals',
  'get_compensation',
  'get_succession_planning',
  'query_odata_entity'
];
describeMcpCompatibleToolSchemas('SAP SuccessFactors input schemas', provider.actions);
describe('Preserved SAP SuccessFactors contracts', () => {
  it('retains fourteen legacy keys and only two approved additions', () => {
    expect(provider.actions.map(a => a.key).sort()).toEqual(
      [...keys, 'get_current_context', 'get_api_metadata'].sort()
    );
    expect(provider.actions.every(a => `sap-successfactors-${a.key}`.length < 60)).toBe(true);
  });
  it('preserves branching inputs and numeric legacy IDs', () => {
    let action = (key: string) => provider.actions.find(a => a.key === key)!;
    for (let operation of ['create', 'update'])
      expect(
        action('manage_employee').inputSchema.safeParse({
          operation,
          entitySet: 'User',
          fields: {},
          keys: { userId: '0123' }
        }).success
      ).toBe(true);
    for (let operation of ['search', 'create'])
      expect(
        action('manage_time_off').inputSchema.safeParse({
          operation,
          userId: '0123',
          startDate: '2026-01-01',
          endDate: '2026-01-02'
        }).success
      ).toBe(true);
    expect(
      action('get_job_application').inputSchema.safeParse({ applicationId: 123 }).success
    ).toBe(true);
    expect(
      action('get_performance_reviews').inputSchema.safeParse({ formDataId: 123 }).success
    ).toBe(true);
    expect(
      action('query_odata_entity').inputSchema.safeParse({
        entitySet: 'EmpJob',
        compoundKeys: { userId: '0123', seqNumber: 1, startDate: '2026-01-01' }
      }).success
    ).toBe(true);
  });
});
