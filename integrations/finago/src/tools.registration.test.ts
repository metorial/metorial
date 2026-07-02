import { describe, expect, it } from 'vitest';
import { provider } from './index';

describe('Finago tool registration', () => {
  it('defers high-risk destructive writes until live validation is available', () => {
    let actionKeys = provider.actions.map(action => action.key);

    expect(actionKeys).toContain('finago_create_sales_order');
    expect(actionKeys).not.toContain('finago_invoice_sales_order');
    expect(actionKeys).not.toContain('finago_post_transaction');
  });
});
