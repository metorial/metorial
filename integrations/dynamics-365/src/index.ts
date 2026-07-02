import { Slate } from 'slates';
import { spec } from './spec';
import { relabelDynamicsAction } from './subservices';
import {
  associateRecords,
  createRecord,
  deleteRecord,
  disassociateRecords,
  downloadFileColumn,
  executeBatch,
  fetchXmlQuery,
  getEntityAttributes,
  getRecord,
  getRelatedRecords,
  invokeAction,
  invokeFunction,
  listEntities,
  listRecords,
  searchRecords,
  updateRecord,
  uploadFileColumn,
  whoAmI
} from './tools';
import {
  getCustomer as getBusinessCentralCustomer,
  getVendor as getBusinessCentralVendor,
  getPurchaseInvoice,
  getSalesInvoice,
  getSalesInvoicePdf,
  listAccounts,
  listCustomers as listBusinessCentralCustomers,
  listJournals as listBusinessCentralJournals,
  listVendors as listBusinessCentralVendors,
  listCompanies,
  listDocumentAttachments,
  listGeneralLedgerEntries,
  listItems,
  listPurchaseInvoices,
  listSalesInvoices
} from './tools/business-central';
import {
  downloadRetailServerMetadata,
  lookupCatalogs,
  lookupChannelsStores,
  lookupProductsPricesInventory,
  manageCarts,
  manageCustomers as manageCommerceCustomers,
  manageOrders
} from './tools/commerce';
import {
  exportConversationTranscript,
  getContactCenterRecord,
  getRepresentativeAvailability,
  listContactCenterRecords
} from './tools/contact-center';
import {
  exportSegmentMembers,
  getCustomerInsightsRecord,
  listCustomerInsightsRecords,
  listCustomerInsightsTables
} from './tools/customer-insights';
import {
  createCustomerServiceRecord,
  downloadNoteAttachment,
  getCustomerServiceRecord,
  listCustomerServiceRecords,
  manageCaseWorkflow,
  manageQueueItemWorkflow,
  updateCustomerServiceRecord
} from './tools/customer-service';
import {
  createFieldServiceRecord,
  getFieldServiceRecord,
  listFieldServiceRecords,
  manageWorkOrderLifecycle,
  scheduleBooking,
  updateBooking,
  updateFieldServiceRecord
} from './tools/field-service';
import {
  createJournalDraftRecord,
  getCustomer as getFinanceCustomer,
  getVendor as getFinanceVendor,
  getJournal,
  getVendorInvoice,
  listChartOfAccounts,
  listCustomers as listFinanceCustomers,
  listJournals as listFinanceJournals,
  listVendors as listFinanceVendors,
  listLedgerEntries,
  listLegalEntities,
  listVendorInvoices,
  runDataManagementPackageOperation
} from './tools/finance';
import {
  getBenefitEnrollment,
  getCompensationPlan,
  getDepartment,
  getEmployee,
  getJob,
  getLeaveBalance,
  getLeaveRequest,
  getPosition,
  getWorker,
  listBenefitEnrollments,
  listCompensationPlans,
  listDepartments,
  listEmployees,
  listJobs,
  listLeaveBalances,
  listLeaveRequests,
  listPositions,
  listWorkers
} from './tools/human-resources';
import {
  manageExpenses,
  manageFinanceHandoff,
  manageProjectActuals,
  manageProjectContracts,
  manageProjectInvoices,
  manageProjectSchedule,
  manageProjects,
  manageProjectTasks,
  manageResourceAssignments,
  manageTimeEntries
} from './tools/project-operations';
import {
  closeOpportunity,
  createSalesRecord,
  deleteSalesRecord,
  getSalesRecord,
  listSalesRecords,
  qualifyLead,
  updateSalesRecord
} from './tools/sales';
import {
  getPurchaseOrder,
  getReleasedProduct,
  getSalesOrder,
  listInventoryOnHand,
  listProducts,
  listPurchaseOrderLines,
  listPurchaseOrders,
  listReceipts,
  listReleasedProducts,
  listSalesOrderLines,
  listSalesOrders,
  listShipments,
  listWarehouses
} from './tools/supply-chain';
import { inboundWebhook, recordChanged } from './triggers';

let action = relabelDynamicsAction;

export let provider = Slate.create({
  spec,
  tools: [
    action(createRecord, 'dataverse_create_record'),
    action(getRecord, 'dataverse_get_record'),
    action(updateRecord, 'dataverse_update_record'),
    action(deleteRecord, 'dataverse_delete_record'),
    action(listRecords, 'dataverse_list_records'),
    action(fetchXmlQuery, 'dataverse_fetch_xml_query'),
    action(searchRecords, 'dataverse_search_records'),
    action(downloadFileColumn, 'dataverse_download_file_column'),
    action(uploadFileColumn, 'dataverse_upload_file_column'),
    action(executeBatch, 'dataverse_execute_batch'),
    action(associateRecords, 'dataverse_associate_records'),
    action(disassociateRecords, 'dataverse_disassociate_records'),
    action(getRelatedRecords, 'dataverse_get_related_records'),
    action(listEntities, 'dataverse_list_entities'),
    action(getEntityAttributes, 'dataverse_get_entity_attributes'),
    action(invokeFunction, 'dataverse_invoke_function'),
    action(invokeAction, 'dataverse_invoke_action'),
    action(whoAmI, 'dataverse_who_am_i'),

    action(listSalesRecords, 'sales_list_records'),
    action(getSalesRecord, 'sales_get_record'),
    action(createSalesRecord, 'sales_create_record'),
    action(updateSalesRecord, 'sales_update_record'),
    action(deleteSalesRecord, 'sales_delete_record'),
    action(qualifyLead, 'sales_qualify_lead'),
    action(closeOpportunity, 'sales_close_opportunity'),

    action(listCustomerServiceRecords, 'customer_service_list_records'),
    action(getCustomerServiceRecord, 'customer_service_get_record'),
    action(createCustomerServiceRecord, 'customer_service_create_record'),
    action(updateCustomerServiceRecord, 'customer_service_update_record'),
    action(manageCaseWorkflow, 'customer_service_manage_case_workflow'),
    action(manageQueueItemWorkflow, 'customer_service_manage_queue_item_workflow'),
    action(downloadNoteAttachment, 'customer_service_download_note_attachment'),

    action(listFieldServiceRecords, 'field_service_list_records'),
    action(getFieldServiceRecord, 'field_service_get_record'),
    action(createFieldServiceRecord, 'field_service_create_record'),
    action(updateFieldServiceRecord, 'field_service_update_record'),
    action(scheduleBooking, 'field_service_schedule_booking'),
    action(updateBooking, 'field_service_update_booking'),
    action(manageWorkOrderLifecycle, 'field_service_manage_work_order_lifecycle'),

    action(listContactCenterRecords, 'contact_center_list_records'),
    action(getContactCenterRecord, 'contact_center_get_record'),
    action(exportConversationTranscript, 'contact_center_export_conversation_transcript'),
    action(getRepresentativeAvailability, 'contact_center_get_representative_availability'),

    action(listCustomerInsightsTables, 'customer_insights_list_tables'),
    action(listCustomerInsightsRecords, 'customer_insights_list_records'),
    action(getCustomerInsightsRecord, 'customer_insights_get_record'),
    action(exportSegmentMembers, 'customer_insights_export_segment_members'),

    action(listLegalEntities, 'finance_list_legal_entities'),
    action(listChartOfAccounts, 'finance_list_chart_of_accounts'),
    action(listLedgerEntries, 'finance_list_ledger_entries'),
    action(listFinanceJournals, 'finance_list_journals'),
    action(getJournal, 'finance_get_journal'),
    action(createJournalDraftRecord, 'finance_create_journal_draft_record'),
    action(listFinanceCustomers, 'finance_list_customers'),
    action(getFinanceCustomer, 'finance_get_customer'),
    action(listFinanceVendors, 'finance_list_vendors'),
    action(getFinanceVendor, 'finance_get_vendor'),
    action(listVendorInvoices, 'finance_list_vendor_invoices'),
    action(getVendorInvoice, 'finance_get_vendor_invoice'),
    action(runDataManagementPackageOperation, 'finance_run_data_management_package_operation'),

    action(listProducts, 'supply_chain_list_products'),
    action(listReleasedProducts, 'supply_chain_list_released_products'),
    action(getReleasedProduct, 'supply_chain_get_released_product'),
    action(listInventoryOnHand, 'supply_chain_list_inventory_on_hand'),
    action(listWarehouses, 'supply_chain_list_warehouses'),
    action(listPurchaseOrders, 'supply_chain_list_purchase_orders'),
    action(listPurchaseOrderLines, 'supply_chain_list_purchase_order_lines'),
    action(getPurchaseOrder, 'supply_chain_get_purchase_order'),
    action(listSalesOrders, 'supply_chain_list_sales_orders'),
    action(listSalesOrderLines, 'supply_chain_list_sales_order_lines'),
    action(getSalesOrder, 'supply_chain_get_sales_order'),
    action(listShipments, 'supply_chain_list_shipments'),
    action(listReceipts, 'supply_chain_list_receipts'),

    action(manageProjects, 'project_operations_manage_projects'),
    action(manageProjectTasks, 'project_operations_manage_project_tasks'),
    action(manageResourceAssignments, 'project_operations_manage_resource_assignments'),
    action(manageTimeEntries, 'project_operations_manage_time_entries'),
    action(manageExpenses, 'project_operations_manage_expenses'),
    action(manageProjectContracts, 'project_operations_manage_project_contracts'),
    action(manageProjectActuals, 'project_operations_manage_project_actuals'),
    action(manageProjectInvoices, 'project_operations_manage_project_invoices'),
    action(manageProjectSchedule, 'project_operations_manage_project_schedule'),
    action(manageFinanceHandoff, 'project_operations_manage_finance_handoff'),

    action(lookupChannelsStores, 'commerce_lookup_channels_stores'),
    action(lookupCatalogs, 'commerce_lookup_catalogs'),
    action(lookupProductsPricesInventory, 'commerce_lookup_products_prices_inventory'),
    action(manageCommerceCustomers, 'commerce_manage_customers'),
    action(manageCarts, 'commerce_manage_carts'),
    action(manageOrders, 'commerce_manage_orders'),
    action(downloadRetailServerMetadata, 'commerce_download_retail_server_metadata'),

    action(listWorkers, 'human_resources_list_workers'),
    action(getWorker, 'human_resources_get_worker'),
    action(listEmployees, 'human_resources_list_employees'),
    action(getEmployee, 'human_resources_get_employee'),
    action(listPositions, 'human_resources_list_positions'),
    action(getPosition, 'human_resources_get_position'),
    action(listJobs, 'human_resources_list_jobs'),
    action(getJob, 'human_resources_get_job'),
    action(listDepartments, 'human_resources_list_departments'),
    action(getDepartment, 'human_resources_get_department'),
    action(listLeaveBalances, 'human_resources_list_leave_balances'),
    action(getLeaveBalance, 'human_resources_get_leave_balance'),
    action(listLeaveRequests, 'human_resources_list_leave_requests'),
    action(getLeaveRequest, 'human_resources_get_leave_request'),
    action(listCompensationPlans, 'human_resources_list_compensation_plans'),
    action(getCompensationPlan, 'human_resources_get_compensation_plan'),
    action(listBenefitEnrollments, 'human_resources_list_benefit_enrollments'),
    action(getBenefitEnrollment, 'human_resources_get_benefit_enrollment'),

    action(listCompanies, 'business_central_list_companies'),
    action(listBusinessCentralCustomers, 'business_central_list_customers'),
    action(getBusinessCentralCustomer, 'business_central_get_customer'),
    action(listBusinessCentralVendors, 'business_central_list_vendors'),
    action(getBusinessCentralVendor, 'business_central_get_vendor'),
    action(listSalesInvoices, 'business_central_list_sales_invoices'),
    action(getSalesInvoice, 'business_central_get_sales_invoice'),
    action(getSalesInvoicePdf, 'business_central_get_sales_invoice_pdf'),
    action(listPurchaseInvoices, 'business_central_list_purchase_invoices'),
    action(getPurchaseInvoice, 'business_central_get_purchase_invoice'),
    action(listItems, 'business_central_list_items'),
    action(listAccounts, 'business_central_list_accounts'),
    action(listGeneralLedgerEntries, 'business_central_list_general_ledger_entries'),
    action(listBusinessCentralJournals, 'business_central_list_journals'),
    action(listDocumentAttachments, 'business_central_list_document_attachments')
  ],
  triggers: [
    action(inboundWebhook, 'dataverse_inbound_webhook'),
    action(recordChanged, 'dataverse_record_changed')
  ]
});
