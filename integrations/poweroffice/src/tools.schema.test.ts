import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('PowerOffice tool input schemas', provider.actions);

let readOnlyToolIds = [
  'poweroffice_get_client_integration_info',
  'poweroffice_list_general_ledger_accounts',
  'poweroffice_list_vat_codes',
  'poweroffice_list_sales_settings',
  'poweroffice_list_financial_settings',
  'poweroffice_list_projects',
  'poweroffice_list_departments',
  'poweroffice_list_locations',
  'poweroffice_list_custom_dimensions',
  'poweroffice_list_customers',
  'poweroffice_list_suppliers',
  'poweroffice_list_products',
  'poweroffice_list_sales_orders',
  'poweroffice_get_sales_order',
  'poweroffice_get_sales_order_lines',
  'poweroffice_get_sales_order_sent_state',
  'poweroffice_list_sales_order_attachments',
  'poweroffice_download_sales_order_attachment',
  'poweroffice_list_outgoing_invoices',
  'poweroffice_get_outgoing_invoice',
  'poweroffice_get_outgoing_invoice_lines',
  'poweroffice_list_incoming_invoices',
  'poweroffice_get_incoming_invoice',
  'poweroffice_list_account_transactions',
  'poweroffice_list_customer_ledger',
  'poweroffice_list_supplier_ledger',
  'poweroffice_get_trial_balance',
  'poweroffice_download_voucher_documentation',
  'poweroffice_list_journal_entry_vouchers',
  'poweroffice_list_voucher_approval_queue'
];

let nonDestructiveWriteToolIds = [
  'poweroffice_upsert_customer',
  'poweroffice_upsert_supplier',
  'poweroffice_upsert_product',
  'poweroffice_create_sales_order',
  'poweroffice_create_supplier_invoice_voucher_draft',
  'poweroffice_upload_journal_entry_voucher_page',
  'poweroffice_submit_journal_entry_voucher_for_approval'
];

let destructiveToolIds = [
  'poweroffice_manage_sales_order_line',
  'poweroffice_send_sales_order_invoice',
  'poweroffice_update_voucher_approval'
];

describe('PowerOffice tool metadata', () => {
  it('marks read-only and destructive hints consistently', () => {
    let expectedToolIds = [
      ...readOnlyToolIds,
      ...nonDestructiveWriteToolIds,
      ...destructiveToolIds
    ].sort();
    let actualToolIds = provider.actions.map(action => action.key).sort();

    expect(actualToolIds).toEqual(expectedToolIds);

    let readOnlyTools = new Set(readOnlyToolIds);
    let destructiveTools = new Set(destructiveToolIds);

    for (let action of provider.actions) {
      let tags = action.parameters.tags;

      expect(tags?.readOnly ?? false, `${action.key} readOnly`).toBe(
        readOnlyTools.has(action.key)
      );
      expect(tags?.destructive ?? false, `${action.key} destructive`).toBe(
        destructiveTools.has(action.key)
      );
    }
  });
});
