import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';

describeMcpCompatibleToolSchemas('SpareBank 1 Regnskap tool input schemas', provider.actions);

describe('SpareBank 1 Regnskap product tool schema', () => {
  it('exposes documented Product fields as structured list filters', () => {
    let action = provider.actions.find(child => child.key === 'list_products');
    let inputSchema = z.toJSONSchema(action?.inputSchema ?? z.object({})) as {
      properties?: Record<string, { type?: string }>;
    };

    expect(inputSchema.properties?.externalProductNumber?.type).toBe('string');
    expect(inputSchema.properties?.defaultProductCategoryId?.type).toBe('integer');
    expect(inputSchema.properties?.statusCode?.type).toBe('integer');
  });
});

describe('SpareBank 1 Regnskap get_trial_balance schema', () => {
  it('does not expose undocumented report query parameters', () => {
    let action = provider.actions.find(child => child.key === 'get_trial_balance');
    let inputSchema = z.toJSONSchema(action?.inputSchema ?? z.object({})) as {
      properties?: Record<string, unknown>;
    };

    expect(inputSchema.properties).toHaveProperty('companyKey');
    expect(inputSchema.properties).not.toHaveProperty('financialYear');
    expect(inputSchema.properties).not.toHaveProperty('select');
    expect(inputSchema.properties).not.toHaveProperty('expand');
  });
});

describe('SpareBank 1 Regnskap get_profit_and_loss schema', () => {
  it('matches the documented report query parameters', () => {
    let action = provider.actions.find(child => child.key === 'get_profit_and_loss');
    let inputSchema = z.toJSONSchema(action?.inputSchema ?? z.object({})) as {
      properties?: Record<string, { type?: string }>;
    };

    expect(inputSchema.properties).toHaveProperty('companyKey');
    expect(inputSchema.properties?.financialYear?.type).toBe('integer');
    expect(inputSchema.properties?.sumAllYears?.type).toBe('string');
    expect(inputSchema.properties).not.toHaveProperty('select');
    expect(inputSchema.properties).not.toHaveProperty('expand');
  });
});

describe('SpareBank 1 Regnskap get_balance_sheet schema', () => {
  it('matches the documented report query parameters', () => {
    let action = provider.actions.find(child => child.key === 'get_balance_sheet');
    let inputSchema = z.toJSONSchema(action?.inputSchema ?? z.object({})) as {
      properties?: Record<string, { type?: string }>;
    };

    expect(inputSchema.properties).toHaveProperty('companyKey');
    expect(inputSchema.properties?.financialYear?.type).toBe('integer');
    expect(inputSchema.properties).not.toHaveProperty('select');
    expect(inputSchema.properties).not.toHaveProperty('expand');
  });
});
