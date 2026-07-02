import { createDraftRecordTool, createGetRecordTool, createListRecordsTool } from './shared';

export let listLegalEntities = createListRecordsTool({
  key: 'list_legal_entities',
  name: 'List Finance Legal Entities',
  description:
    'List Dynamics 365 Finance legal entities available through Finance and Operations OData.',
  outputKey: 'legalEntities',
  entitySetName: 'LegalEntities',
  companyScoped: false,
  idFields: ['LegalEntityId', 'CompanyId'],
  numberFields: ['LegalEntityId', 'CompanyId'],
  nameFields: ['Name', 'CompanyName']
});

export let listChartOfAccounts = createListRecordsTool({
  key: 'list_chart_of_accounts',
  name: 'List Finance Chart Of Accounts',
  description:
    'List Dynamics 365 Finance chart-of-accounts and main account records through Finance and Operations OData.',
  outputKey: 'accounts',
  entitySetName: 'MainAccounts',
  companyScoped: false,
  idFields: ['MainAccountRecId', 'MainAccountId'],
  numberFields: ['MainAccountId', 'MainAccountNumber'],
  nameFields: ['Name', 'MainAccountName'],
  statusFields: ['AccountType']
});

export let listLedgerEntries = createListRecordsTool({
  key: 'list_ledger_entries',
  name: 'List Finance Ledger Entries',
  description:
    'List Dynamics 365 Finance general ledger entry records by legal entity, filters, and OData query options.',
  outputKey: 'ledgerEntries',
  entitySetName: 'GeneralJournalAccountEntryEntity',
  companyScoped: true,
  idFields: ['GeneralJournalAccountEntryRecId', 'RecId'],
  numberFields: ['Voucher', 'JournalNumber', 'DocumentNumber'],
  nameFields: ['Text', 'Description'],
  dateFields: ['AccountingDate', 'TransDate'],
  amountFields: ['AccountingCurrencyAmount', 'TransactionCurrencyAmount', 'AmountMST'],
  currencyFields: ['TransactionCurrencyCode', 'AccountingCurrency']
});

export let listJournals = createListRecordsTool({
  key: 'list_journals',
  name: 'List Finance Journals',
  description:
    'List Dynamics 365 Finance journal header records for draft review and operational status checks.',
  outputKey: 'journals',
  entitySetName: 'LedgerJournalHeaders',
  companyScoped: true,
  idFields: ['JournalBatchNumber', 'JournalNumber'],
  numberFields: ['JournalBatchNumber', 'JournalNumber'],
  nameFields: ['Description', 'JournalName'],
  statusFields: ['JournalWorkflowApprovalStatus', 'ApprovalStatus'],
  dateFields: ['PostedDateTime', 'CreatedDateTime']
});

export let getJournal = createGetRecordTool({
  key: 'get_journal',
  name: 'Get Finance Journal',
  description:
    'Retrieve one Dynamics 365 Finance journal header record by OData key values. Include dataAreaId when required by metadata.',
  outputKey: 'journal',
  entitySetName: 'LedgerJournalHeaders',
  companyScoped: true,
  idFields: ['JournalBatchNumber', 'JournalNumber'],
  numberFields: ['JournalBatchNumber', 'JournalNumber'],
  nameFields: ['Description', 'JournalName'],
  statusFields: ['JournalWorkflowApprovalStatus', 'ApprovalStatus'],
  dateFields: ['PostedDateTime', 'CreatedDateTime']
});

export let createJournalDraftRecord = createDraftRecordTool({
  key: 'create_journal_draft_record',
  name: 'Create Finance Journal Draft Record',
  description:
    'Create a non-posted Dynamics 365 Finance journal draft data entity record. Use this for draft/import workflows only; posting is intentionally not exposed.',
  outputKey: 'journalDraftRecord',
  entitySetName: 'LedgerJournalLines',
  companyScoped: true,
  idFields: ['RecId', 'LineNumber'],
  numberFields: ['JournalBatchNumber', 'Voucher'],
  nameFields: ['Text', 'Description'],
  statusFields: ['ApprovalStatus'],
  dateFields: ['TransDate', 'AccountingDate'],
  amountFields: ['DebitAmount', 'CreditAmount', 'AmountCurDebit', 'AmountCurCredit'],
  currencyFields: ['CurrencyCode']
});

export let listCustomers = createListRecordsTool({
  key: 'list_customers',
  name: 'List Finance Customers',
  description:
    'List Dynamics 365 Finance customer master records by legal entity and OData filters.',
  outputKey: 'customers',
  entitySetName: 'CustomersV3',
  companyScoped: true,
  idFields: ['CustomerAccount', 'AccountNum'],
  numberFields: ['CustomerAccount', 'AccountNum'],
  nameFields: ['OrganizationName', 'Name', 'CustomerName'],
  statusFields: ['Blocked']
});

export let getCustomer = createGetRecordTool({
  key: 'get_customer',
  name: 'Get Finance Customer',
  description:
    'Retrieve one Dynamics 365 Finance customer record by OData key values. Include dataAreaId when required by metadata.',
  outputKey: 'customer',
  entitySetName: 'CustomersV3',
  companyScoped: true,
  idFields: ['CustomerAccount', 'AccountNum'],
  numberFields: ['CustomerAccount', 'AccountNum'],
  nameFields: ['OrganizationName', 'Name', 'CustomerName'],
  statusFields: ['Blocked']
});

export let listVendors = createListRecordsTool({
  key: 'list_vendors',
  name: 'List Finance Vendors',
  description:
    'List Dynamics 365 Finance vendor master records by legal entity and OData filters.',
  outputKey: 'vendors',
  entitySetName: 'VendorsV2',
  companyScoped: true,
  idFields: ['VendorAccountNumber', 'AccountNum'],
  numberFields: ['VendorAccountNumber', 'AccountNum'],
  nameFields: ['VendorOrganizationName', 'Name', 'VendorName'],
  statusFields: ['Blocked']
});

export let getVendor = createGetRecordTool({
  key: 'get_vendor',
  name: 'Get Finance Vendor',
  description:
    'Retrieve one Dynamics 365 Finance vendor record by OData key values. Include dataAreaId when required by metadata.',
  outputKey: 'vendor',
  entitySetName: 'VendorsV2',
  companyScoped: true,
  idFields: ['VendorAccountNumber', 'AccountNum'],
  numberFields: ['VendorAccountNumber', 'AccountNum'],
  nameFields: ['VendorOrganizationName', 'Name', 'VendorName'],
  statusFields: ['Blocked']
});

export let listVendorInvoices = createListRecordsTool({
  key: 'list_vendor_invoices',
  name: 'List Finance Vendor Invoices',
  description:
    'List Dynamics 365 Finance vendor invoice header records for review, matching, and import status workflows.',
  outputKey: 'vendorInvoices',
  entitySetName: 'VendorInvoiceHeaders',
  companyScoped: true,
  idFields: ['InvoiceId', 'VendorInvoiceNumber', 'RecId'],
  numberFields: ['InvoiceId', 'VendorInvoiceNumber', 'InvoiceNumber'],
  nameFields: ['Description', 'InvoiceDescription'],
  statusFields: ['InvoiceStatus', 'DocumentStatus', 'ApprovalStatus'],
  dateFields: ['InvoiceDate', 'DocumentDate'],
  amountFields: ['InvoiceAmount', 'TotalInvoiceAmount'],
  currencyFields: ['CurrencyCode']
});

export let getVendorInvoice = createGetRecordTool({
  key: 'get_vendor_invoice',
  name: 'Get Finance Vendor Invoice',
  description:
    'Retrieve one Dynamics 365 Finance vendor invoice header record by OData key values. Include dataAreaId when required by metadata.',
  outputKey: 'vendorInvoice',
  entitySetName: 'VendorInvoiceHeaders',
  companyScoped: true,
  idFields: ['InvoiceId', 'VendorInvoiceNumber', 'RecId'],
  numberFields: ['InvoiceId', 'VendorInvoiceNumber', 'InvoiceNumber'],
  nameFields: ['Description', 'InvoiceDescription'],
  statusFields: ['InvoiceStatus', 'DocumentStatus', 'ApprovalStatus'],
  dateFields: ['InvoiceDate', 'DocumentDate'],
  amountFields: ['InvoiceAmount', 'TotalInvoiceAmount'],
  currencyFields: ['CurrencyCode']
});
