import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

describeMcpCompatibleToolSchemas('Breathe HR', provider.actions);
describe('retained schema contracts', () => {
  it('retains every existing public key without triggers', () => {
    expect(
      provider.actions
        .filter(action => action.type === 'tool')
        .map(action => action.key)
        .sort()
    ).toEqual(
      [
        'cancel_absence',
        'create_employee',
        'create_sickness',
        'get_account',
        'get_department_data',
        'get_employee',
        'list_absences',
        'list_bonuses',
        'list_employees',
        'list_holiday_allowances',
        'list_leave_requests',
        'list_organization',
        'list_other_leave_reasons',
        'list_salaries',
        'list_sicknesses',
        'list_training',
        'list_working_patterns',
        'manage_expense',
        'manage_expense_claim',
        'manage_leave_request'
      ].sort()
    );
    expect(provider.actions.filter(action => action.type === 'trigger')).toHaveLength(0);
  });
  it('preserves legacy optional fields and branch actions', () => {
    const tool = (key: string) =>
      provider.actions.find(action => action.type === 'tool' && action.key === key);
    const employee = tool('create_employee');
    expect(employee?.type).toBe('tool');
    if (employee?.type === 'tool')
      expect(
        employee.inputSchema.safeParse({ firstName: 'Example', lastName: 'Person' }).success
      ).toBe(true);
    for (const [key, input] of [
      ['manage_expense', { action: 'create' }],
      ['manage_expense_claim', { action: 'update' }],
      ['manage_leave_request', { action: 'approve' }],
      ['create_sickness', { employeeId: '7', startDate: '2026/10/06' }]
    ] as const) {
      const action = tool(key);
      expect(action?.type).toBe('tool');
      if (action?.type === 'tool')
        expect(action.inputSchema.safeParse(input).success).toBe(true);
    }
  });
});
