import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('SAP S/4HANA tool input schemas', provider.actions);

let readOnlyToolIds = [
  'list_business_partners',
  'get_business_partner',
  'list_sales_orders',
  'get_sales_order',
  'list_billing_documents',
  'get_billing_document',
  'list_products',
  'get_product',
  'list_purchase_orders',
  'get_purchase_order',
  'list_supplier_invoices',
  'get_supplier_invoice'
];

describe('SAP S/4HANA tool metadata', () => {
  it('registers the expected read-only tool surface', () => {
    expect(provider.actions.map(action => action.key).sort()).toEqual(
      [...readOnlyToolIds].sort()
    );

    for (let action of provider.actions) {
      expect(action.parameters.tags?.readOnly ?? false, `${action.key} readOnly`).toBe(true);
      expect(action.parameters.tags?.destructive ?? false, `${action.key} destructive`).toBe(
        false
      );
    }
  });
});
