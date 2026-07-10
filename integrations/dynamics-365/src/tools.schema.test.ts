import {
  createLocalSlateTestClient,
  describeMcpCompatibleToolSchemas,
  expectSlateContract
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { auth } from './auth';
import { config } from './config';
import { provider } from './index';
import {
  dynamicsSubservices,
  getAuthMethodsForActionKey,
  getSubserviceForActionKey
} from './subservices';

describeMcpCompatibleToolSchemas('Dynamics 365 tool input schemas', provider.actions);

let expectedToolIds = [
  'dataverse_create_record',
  'dataverse_get_record',
  'dataverse_update_record',
  'dataverse_delete_record',
  'dataverse_list_records',
  'dataverse_fetch_xml_query',
  'dataverse_search_records',
  'dataverse_download_file_column',
  'dataverse_upload_file_column',
  'dataverse_execute_batch',
  'dataverse_associate_records',
  'dataverse_disassociate_records',
  'dataverse_get_related_records',
  'dataverse_list_entities',
  'dataverse_get_entity_attributes',
  'dataverse_invoke_function',
  'dataverse_invoke_action',
  'dataverse_who_am_i',
  'sales_list_records',
  'sales_get_record',
  'sales_create_record',
  'sales_update_record',
  'sales_delete_record',
  'sales_qualify_lead',
  'sales_close_opportunity',
  'customer_service_list_records',
  'customer_service_get_record',
  'customer_service_create_record',
  'customer_service_update_record',
  'customer_service_manage_case_workflow',
  'customer_service_manage_queue_item_workflow',
  'customer_service_download_note_attachment',
  'field_service_list_records',
  'field_service_get_record',
  'field_service_create_record',
  'field_service_update_record',
  'field_service_schedule_booking',
  'field_service_update_booking',
  'field_service_manage_work_order_lifecycle',
  'contact_center_list_records',
  'contact_center_get_record',
  'contact_center_export_conversation_transcript',
  'contact_center_get_representative_availability',
  'customer_insights_list_tables',
  'customer_insights_list_records',
  'customer_insights_get_record',
  'customer_insights_export_segment_members',
  'finance_list_legal_entities',
  'finance_list_chart_of_accounts',
  'finance_list_ledger_entries',
  'finance_list_journals',
  'finance_get_journal',
  'finance_create_journal_draft_record',
  'finance_list_customers',
  'finance_get_customer',
  'finance_list_vendors',
  'finance_get_vendor',
  'finance_list_vendor_invoices',
  'finance_get_vendor_invoice',
  'finance_run_data_management_package_operation',
  'supply_chain_list_products',
  'supply_chain_list_released_products',
  'supply_chain_get_released_product',
  'supply_chain_list_inventory_on_hand',
  'supply_chain_list_warehouses',
  'supply_chain_list_purchase_orders',
  'supply_chain_list_purchase_order_lines',
  'supply_chain_get_purchase_order',
  'supply_chain_list_sales_orders',
  'supply_chain_list_sales_order_lines',
  'supply_chain_get_sales_order',
  'supply_chain_list_shipments',
  'supply_chain_list_receipts',
  'project_operations_manage_projects',
  'project_operations_manage_project_tasks',
  'project_operations_manage_resource_assignments',
  'project_operations_manage_time_entries',
  'project_operations_manage_expenses',
  'project_operations_manage_project_contracts',
  'project_operations_manage_project_actuals',
  'project_operations_manage_project_invoices',
  'project_operations_manage_project_schedule',
  'project_operations_manage_finance_handoff',
  'commerce_lookup_channels_stores',
  'commerce_lookup_catalogs',
  'commerce_lookup_products_prices_inventory',
  'commerce_manage_customers',
  'commerce_manage_carts',
  'commerce_manage_orders',
  'commerce_download_retail_server_metadata',
  'human_resources_list_workers',
  'human_resources_get_worker',
  'human_resources_list_employees',
  'human_resources_get_employee',
  'human_resources_list_positions',
  'human_resources_get_position',
  'human_resources_list_jobs',
  'human_resources_get_job',
  'human_resources_list_departments',
  'human_resources_get_department',
  'human_resources_list_leave_balances',
  'human_resources_get_leave_balance',
  'human_resources_list_leave_requests',
  'human_resources_get_leave_request',
  'human_resources_list_compensation_plans',
  'human_resources_get_compensation_plan',
  'human_resources_list_benefit_enrollments',
  'human_resources_get_benefit_enrollment',
  'business_central_list_companies',
  'business_central_list_customers',
  'business_central_get_customer',
  'business_central_list_vendors',
  'business_central_get_vendor',
  'business_central_list_sales_invoices',
  'business_central_get_sales_invoice',
  'business_central_get_sales_invoice_pdf',
  'business_central_list_purchase_invoices',
  'business_central_get_purchase_invoice',
  'business_central_list_items',
  'business_central_list_accounts',
  'business_central_list_general_ledger_entries',
  'business_central_list_journals',
  'business_central_list_document_attachments'
];

let expectedTriggerIds = ['dataverse_inbound_webhook', 'dataverse_record_changed'];

let expectedAuthMethodsForActionId = (id: string) => [
  ...(getAuthMethodsForActionKey(id) ?? [])
];

describe('Dynamics 365 merged provider contract', () => {
  it('exposes the merged provider, action, trigger, and auth surface', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'dynamics-365',
        name: 'Dynamics 365'
      },
      toolIds: expectedToolIds,
      triggerIds: expectedTriggerIds,
      authMethodIds: [
        'oauth_common',
        'oauth_organizations',
        'microsoft_client_credentials',
        'commerce_access_token'
      ],
      tools: expectedToolIds.map(id => ({ id })),
      triggers: expectedTriggerIds.map(id => ({ id }))
    });

    expect(contract.actions).toHaveLength(expectedToolIds.length + expectedTriggerIds.length);
    for (let action of contract.actions) {
      expect(action.authMethods).toEqual(expectedAuthMethodsForActionId(action.id));
    }
  });

  it('uses one canonical config and auth surface', () => {
    expect(Object.keys(config.configSchema.toJSONSchema().properties ?? {}).sort()).toEqual([
      'businessCentralCompanyId',
      'businessCentralDefaultLimit',
      'businessCentralEnvironmentName',
      'businessCentralTenantId',
      'commerceCatalogId',
      'commerceChannelId',
      'commerceDefaultPageSize',
      'commerceLocale',
      'commerceMaxPageSize',
      'commerceOperatingUnitNumber',
      'dataverseApiVersion',
      'dataverseInstanceUrl',
      'finOpsBaseUrl',
      'finOpsDefaultLegalEntity',
      'finOpsDefaultMaxPages',
      'finOpsDefaultPageSize',
      'projectOperationsDefaultPageSize',
      'recordChangedEntitySetName',
      'retailServerUrl'
    ]);

    expect(auth.authStack.map(method => method.key)).toEqual([
      'oauth_common',
      'oauth_organizations',
      'microsoft_client_credentials',
      'commerce_access_token'
    ]);
  });

  it('has no duplicate action IDs and no old split-package IDs', () => {
    let actionKeys = provider.actions.map(action => action.key);
    expect(new Set(actionKeys).size).toBe(actionKeys.length);

    expect(actionKeys).not.toEqual(expect.arrayContaining(['create_record']));
    expect(actionKeys).not.toEqual(expect.arrayContaining(['list_customers']));
    expect(actionKeys).not.toEqual(expect.arrayContaining(['inbound_webhook']));
  });

  it('labels every action with its subservice prefix and display name', () => {
    let prefixes = dynamicsSubservices.map(subservice => `${subservice.key}_`);

    for (let action of provider.actions) {
      expect(prefixes.some(prefix => action.key.startsWith(prefix))).toBe(true);
      let subservice = getSubserviceForActionKey(action.key);
      expect(subservice).toBeDefined();
      expect(action.name).toMatch(new RegExp(`^${subservice!.displayName}: `));
      expect(action.description).toMatch(new RegExp(`^${subservice!.displayName}: `));
    }
  });

  it('scopes every action to auth methods supported by its subservice', () => {
    for (let action of provider.actions) {
      let authMethods = expectedAuthMethodsForActionId(action.key);
      expect(authMethods.length).toBeGreaterThan(0);
      expect(action.authMethods).toEqual(authMethods);
    }

    expect(
      provider.actions.find(action => action.key === 'business_central_list_companies')
        ?.authMethods
    ).toEqual(['oauth_common', 'oauth_organizations']);
    expect(
      provider.actions.find(action => action.key === 'commerce_lookup_catalogs')?.authMethods
    ).toEqual(['microsoft_client_credentials', 'commerce_access_token']);
    expect(
      provider.actions.find(
        action => action.key === 'project_operations_manage_project_schedule'
      )?.authMethods
    ).toEqual(['oauth_common', 'oauth_organizations']);
  });

  it('keeps file downloads attachment-only in structured outputs', () => {
    for (let toolId of [
      'dataverse_download_file_column',
      'customer_service_download_note_attachment',
      'business_central_get_sales_invoice_pdf',
      'commerce_download_retail_server_metadata'
    ]) {
      let tool = provider.actions.find(action => action.key === toolId);
      let schemaText = JSON.stringify(tool?.parameters ?? {});
      expect(schemaText).not.toContain('contentBase64');
      expect(schemaText).not.toContain('fileContent');
      expect(schemaText).not.toContain('csvData');
    }
  });
});
