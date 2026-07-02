import { createLocalSlateTestClient, expectSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describe('tripletex auth contract', () => {
  it('exposes separate auth methods with method-specific required fields', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let contract = await expectSlateContract({
      client,
      authMethodIds: ['consumer_employee_token', 'jwt_refresh_token']
    });

    let consumerEmployee = contract.authMethods.find(
      method => method.id === 'consumer_employee_token'
    );
    let jwtRefresh = contract.authMethods.find(method => method.id === 'jwt_refresh_token');

    expect(consumerEmployee?.inputSchema.required).toEqual(['consumerToken', 'employeeToken']);
    expect(consumerEmployee?.inputSchema.properties).not.toHaveProperty('refreshToken');

    expect(jwtRefresh?.inputSchema.required).toEqual(['refreshToken']);
    expect(jwtRefresh?.inputSchema.properties).not.toHaveProperty('consumerToken');
    expect(jwtRefresh?.inputSchema.properties).not.toHaveProperty('employeeToken');
  });
});
