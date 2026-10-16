import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';

describe('MemberVault product discovery deprecation contract', () => {
  it('retains the legacy tool alongside its documented replacement', () => {
    let legacy = provider.actions.find(action => action.key === 'list_products');
    expect(legacy?.tags).toMatchObject({ readOnly: true, deprecated: true });
    expect(legacy?.description?.startsWith('DEPRECATED — use `get_courses` instead.')).toBe(
      true
    );
    expect(
      legacy?.instructions?.some(instruction => instruction.includes('get_courses'))
    ).toBe(true);
    expect(provider.actions.some(action => action.key === 'get_courses')).toBe(true);
  });

  it('preserves the complete legacy product input and output schema', () => {
    let legacy = provider.actions.find(action => action.key === 'list_products');
    expect(legacy).toBeDefined();
    if (!legacy) return;
    expect(z.toJSONSchema(legacy.inputSchema)).toMatchObject({
      type: 'object',
      properties: {},
      additionalProperties: false
    });
    let output = z.toJSONSchema(legacy.outputSchema);
    expect(output.required).toEqual(['products']);
    expect(output.properties?.products).toEqual({
      type: 'array',
      items: {
        type: 'object',
        properties: {
          productId: { type: 'string', description: 'Unique identifier for the product' },
          productName: { type: 'string', description: 'Name of the product' },
          productPrice: { type: 'string', description: 'Price of the product' },
          productUrl: { type: 'string', description: 'URL of the product' },
          productStatus: { type: 'string', description: 'Current status of the product' }
        },
        required: ['productId', 'productName', 'productPrice', 'productUrl', 'productStatus'],
        additionalProperties: false
      },
      description: 'List of all products in the account'
    });
  });
});
