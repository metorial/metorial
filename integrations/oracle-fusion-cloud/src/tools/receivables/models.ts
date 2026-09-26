import { z } from 'zod';
import type { OracleCollectionPath, OracleFusionClient } from '../../lib/client';
import { idField, numberField, type OracleRecord, stringField } from '../../lib/records';
import { resourceIdSchema, resourceKeySchema } from '../../lib/schemas';

const accountIdentityFields = {
  accountId: resourceIdSchema
    .optional()
    .describe('Customer account identifier, distinct from its resource key.'),
  accountNumber: z.string().optional().describe('Customer account business number.'),
  customerId: resourceIdSchema.optional().describe('Customer party identifier.'),
  customerName: z.string().optional().describe('Customer party name.')
};
const timestamps = {
  createdAt: z.string().optional().describe('Oracle creation timestamp.'),
  updatedAt: z.string().optional().describe('Oracle last-update timestamp.')
};
const ledgerAmountHelp =
  'Amount in the ledger currency. This resource does not return the ledger currency code; do not combine it with entered-currency amounts.';

export const customerAccountSchema = z.object({
  resourceKey: resourceKeySchema,
  ...accountIdentityFields,
  ledgerOpenReceivablesAmount: z
    .number()
    .optional()
    .describe(`Total open receivables. ${ledgerAmountHelp}`),
  ledgerTransactionsDueAmount: z
    .number()
    .optional()
    .describe(`Total transactions due. ${ledgerAmountHelp}`),
  ...timestamps
});
export const customerSiteSchema = z.object({
  resourceKey: resourceKeySchema,
  ...accountIdentityFields,
  billToSiteUseId: resourceIdSchema
    .optional()
    .describe(
      'Identifier of the billing site business purpose, distinct from its resource key.'
    ),
  billToSiteNumber: z.string().optional().describe('Customer billing site number.'),
  billToSiteAddress: z.string().optional().describe('Billing site address.'),
  ledgerOpenReceivablesAmount: z
    .number()
    .optional()
    .describe(`Billing site total open receivables. ${ledgerAmountHelp}`),
  ledgerTransactionsDueAmount: z
    .number()
    .optional()
    .describe(`Billing site total transactions due. ${ledgerAmountHelp}`),
  ...timestamps
});
export const customerReceiptSchema = z.object({
  resourceKey: resourceKeySchema,
  standardReceiptId: resourceIdSchema
    .optional()
    .describe('Standard receipt identifier, distinct from its resource key.'),
  receiptNumber: z.string().optional().describe('Receipt business number.'),
  currency: z
    .string()
    .optional()
    .describe(
      'Entered receipt currency code for receiptAmount, availableAmount, and unappliedAmount.'
    ),
  receiptAmount: z
    .number()
    .optional()
    .describe('Original receipt amount in the entered receipt currency.'),
  availableAmount: z
    .number()
    .optional()
    .describe('Remaining receipt amount in the entered receipt currency.'),
  unappliedAmount: z
    .number()
    .optional()
    .describe('Unapplied receipt amount in the entered receipt currency.'),
  receiptDate: z.string().optional().describe('Receipt date.'),
  accountingDate: z.string().optional().describe('Receipt accounting date.'),
  businessUnit: z.string().optional().describe('Receipt business unit.'),
  customerSite: z.string().optional().describe('Customer billing site for the receipt.'),
  receiptMethod: z.string().optional().describe('Receipt method.'),
  processStatus: z.string().optional().describe('Receipt process status.'),
  state: z
    .string()
    .optional()
    .describe('Receipt state, such as Applied, Unapplied, or Unidentified.'),
  legalEntity: z.string().optional().describe('Receipt legal entity name.'),
  ...timestamps
});

export const receivablesInvoiceSchema = z.object({
  resourceKey: resourceKeySchema,
  customerTransactionId: resourceIdSchema
    .optional()
    .describe('Invoice transaction identifier, distinct from its resource key.'),
  transactionNumber: z.string().optional().describe('Receivables invoice transaction number.'),
  invoiceCurrency: z
    .string()
    .optional()
    .describe('Entered invoice currency code for enteredAmount.'),
  enteredAmount: z
    .number()
    .optional()
    .describe('Original invoice amount in the entered invoice currency.'),
  ledgerBalanceDue: z
    .number()
    .optional()
    .describe(`Accounted invoice balance due. ${ledgerAmountHelp}`),
  invoiceStatus: z
    .string()
    .optional()
    .describe('Invoice completion status, such as Complete, Incomplete, or Frozen.'),
  transactionDate: z.string().optional().describe('Invoice transaction date.'),
  accountingDate: z.string().optional().describe('Invoice accounting date.'),
  dueDate: z.string().optional().describe('Invoice installment due date.'),
  businessUnit: z.string().optional().describe('Invoicing business unit.'),
  billToCustomerNumber: z
    .string()
    .optional()
    .describe(
      'Billing customer account number; corresponds to accountNumber in customer activity tools.'
    ),
  billToCustomerName: z.string().optional().describe('Billing customer name.'),
  billToPartyId: resourceIdSchema.optional().describe('Billing customer party identifier.'),
  billToSiteNumber: z
    .string()
    .optional()
    .describe('Billing site number assigned to this invoice.'),
  transactionType: z.string().optional().describe('Invoice transaction type.'),
  transactionSource: z.string().optional().describe('Invoice transaction source.'),
  paymentTerms: z.string().optional().describe('Invoice payment terms.'),
  purchaseOrder: z.string().optional().describe('Customer purchase order reference.'),
  ...timestamps
});
export const invoiceParentOutputFields = {
  receivablesInvoiceKey: resourceKeySchema.describe(
    'Parent invoice resource key, discovered with list_receivables_invoices or get_receivables_invoice.'
  ),
  customerTransactionId: resourceIdSchema
    .optional()
    .describe('Parent invoice transaction identifier.'),
  transactionNumber: z
    .string()
    .optional()
    .describe('Parent invoice business transaction number.'),
  invoiceCurrency: z
    .string()
    .optional()
    .describe(
      'Entered currency code obtained from the parent invoice. Child invoice amounts use this currency; ledger amounts are identified separately.'
    )
};
export const receivablesInvoiceLineSchema = z.object({
  resourceKey: resourceKeySchema,
  customerTransactionLineId: resourceIdSchema
    .optional()
    .describe('Invoice line identifier, distinct from its resource key.'),
  lineNumber: z.number().optional().describe('Invoice line number.'),
  invoiceCurrency: z
    .string()
    .optional()
    .describe(
      'Entered currency code obtained from the parent invoice for lineAmount and unitSellingPrice.'
    ),
  lineAmount: z
    .number()
    .optional()
    .describe('Transaction line amount in the entered invoice currency.'),
  unitSellingPrice: z
    .number()
    .optional()
    .describe('Price per unit in the entered invoice currency.'),
  quantity: z.number().optional().describe('Invoiced quantity.'),
  unitOfMeasure: z.string().optional().describe('Product or service unit of measure.'),
  description: z.string().optional().describe('Invoice line product or service description.'),
  itemNumber: z.string().optional().describe('Inventory item business number.'),
  memoLine: z.string().optional().describe('Invoice memo line.'),
  taxClassificationCode: z.string().optional().describe('Tax classification code.'),
  lineAmountIncludesTax: z
    .string()
    .optional()
    .describe('Whether line amount includes tax, excludes tax, or follows tax setup.'),
  salesOrder: z.string().optional().describe('Sales order reference.'),
  ...timestamps
});
export const receivablesInvoiceInstallmentSchema = z.object({
  resourceKey: resourceKeySchema,
  installmentId: resourceIdSchema
    .optional()
    .describe('Invoice installment identifier, distinct from its resource key.'),
  installmentSequenceNumber: resourceIdSchema
    .optional()
    .describe('Invoice installment sequence number.'),
  invoiceCurrency: z
    .string()
    .optional()
    .describe(
      'Entered currency code obtained from the parent invoice for originalAmount and installmentBalanceDue.'
    ),
  originalAmount: z
    .number()
    .optional()
    .describe('Original installment amount in the entered invoice currency.'),
  installmentBalanceDue: z
    .number()
    .optional()
    .describe('Outstanding installment balance in the entered invoice currency.'),
  ledgerBalanceDue: z
    .number()
    .optional()
    .describe(`Accounted installment balance due. ${ledgerAmountHelp}`),
  installmentDueDate: z.string().optional().describe('Installment due date.'),
  installmentClosedDate: z
    .string()
    .optional()
    .describe('Date the installment payment schedule was closed.'),
  installmentStatus: z.string().optional().describe('Installment status.'),
  paymentDaysLate: z
    .number()
    .int()
    .optional()
    .describe('Days after the installment due date.'),
  disputeDate: z
    .string()
    .optional()
    .describe('Date a dispute was recorded against the installment.'),
  ...timestamps
});

export const customerAccountFields =
  'AccountId,AccountNumber,CustomerId,CustomerName,TotalOpenReceivablesForAccount,TotalTransactionsDueForAccount,CreationDate,LastUpdateDate';
export const customerSiteFields =
  'AccountId,AccountNumber,CustomerId,CustomerName,BillToSiteUseId,BillToSiteNumber,BillToSiteAddress,TotalOpenReceivablesForSite,TotalTransactionsDueForSite,CreationDate,LastUpdateDate';
export const customerReceiptFields =
  'StandardReceiptId,ReceiptNumber,Currency,Amount,AvailableAmount,UnappliedAmount,ReceiptDate,AccountingDate,BusinessUnit,CustomerSite,ReceiptMethod,ProcessStatus,State,LegalEntity,CreationDate,LastUpdateDate';
export const receivablesInvoiceFields =
  'CustomerTransactionId,TransactionNumber,InvoiceCurrencyCode,EnteredAmount,InvoiceBalanceAmount,InvoiceStatus,TransactionDate,AccountingDate,DueDate,BusinessUnit,BillToCustomerNumber,BillToCustomerName,BillToPartyId,BillToSite,TransactionType,TransactionSource,PaymentTerms,PurchaseOrder,CreationDate,LastUpdateDate';
export const invoiceParentFields =
  'CustomerTransactionId,TransactionNumber,InvoiceCurrencyCode';
export const receivablesInvoiceLineFields =
  'CustomerTransactionLineId,LineNumber,LineAmount,UnitSellingPrice,Quantity,UnitOfMeasure,Description,ItemNumber,MemoLine,TaxClassificationCode,LineAmountIncludesTax,SalesOrder,CreationDate,LastUpdateDate';
export const receivablesInvoiceInstallmentFields =
  'InstallmentId,InstallmentSequenceNumber,OriginalAmount,InstallmentBalanceDue,AccountedBalanceDue,InstallmentDueDate,InstallmentClosedDate,InstallmentStatus,PaymentDaysLate,DisputeDate,CreationDate,LastUpdateDate';

const mapAccountIdentity = (record: OracleRecord) => ({
  accountId: idField(record, 'AccountId'),
  accountNumber: stringField(record, 'AccountNumber'),
  customerId: idField(record, 'CustomerId'),
  customerName: stringField(record, 'CustomerName')
});
const mapTimestamps = (record: OracleRecord) => ({
  createdAt: stringField(record, 'CreationDate'),
  updatedAt: stringField(record, 'LastUpdateDate')
});
export const mapCustomerAccount = (client: OracleFusionClient, record: OracleRecord) => ({
  resourceKey: client.resourceKey(record, 'fscm', '/receivablesCustomerAccountActivities'),
  ...mapAccountIdentity(record),
  ledgerOpenReceivablesAmount: numberField(record, 'TotalOpenReceivablesForAccount'),
  ledgerTransactionsDueAmount: numberField(record, 'TotalTransactionsDueForAccount'),
  ...mapTimestamps(record)
});
export const mapCustomerSite = (client: OracleFusionClient, record: OracleRecord) => ({
  resourceKey: client.resourceKey(record, 'fscm', '/receivablesCustomerAccountSiteActivities'),
  ...mapAccountIdentity(record),
  billToSiteUseId: idField(record, 'BillToSiteUseId'),
  billToSiteNumber: stringField(record, 'BillToSiteNumber'),
  billToSiteAddress: stringField(record, 'BillToSiteAddress'),
  ledgerOpenReceivablesAmount: numberField(record, 'TotalOpenReceivablesForSite'),
  ledgerTransactionsDueAmount: numberField(record, 'TotalTransactionsDueForSite'),
  ...mapTimestamps(record)
});
export const mapCustomerReceipt = (
  client: OracleFusionClient,
  collection: OracleCollectionPath,
  record: OracleRecord
) => ({
  resourceKey: client.resourceKey(record, 'fscm', collection),
  standardReceiptId: idField(record, 'StandardReceiptId'),
  receiptNumber: stringField(record, 'ReceiptNumber'),
  currency: stringField(record, 'Currency'),
  receiptAmount: numberField(record, 'Amount'),
  availableAmount: numberField(record, 'AvailableAmount'),
  unappliedAmount: numberField(record, 'UnappliedAmount'),
  receiptDate: stringField(record, 'ReceiptDate'),
  accountingDate: stringField(record, 'AccountingDate'),
  businessUnit: stringField(record, 'BusinessUnit'),
  customerSite: stringField(record, 'CustomerSite'),
  receiptMethod: stringField(record, 'ReceiptMethod'),
  processStatus: stringField(record, 'ProcessStatus'),
  state: stringField(record, 'State'),
  legalEntity: stringField(record, 'LegalEntity'),
  ...mapTimestamps(record)
});
export const mapReceivablesInvoice = (client: OracleFusionClient, record: OracleRecord) => ({
  resourceKey: client.resourceKey(record, 'fscm', '/receivablesInvoices'),
  customerTransactionId: idField(record, 'CustomerTransactionId'),
  transactionNumber: stringField(record, 'TransactionNumber'),
  invoiceCurrency: stringField(record, 'InvoiceCurrencyCode'),
  enteredAmount: numberField(record, 'EnteredAmount'),
  ledgerBalanceDue: numberField(record, 'InvoiceBalanceAmount'),
  invoiceStatus: stringField(record, 'InvoiceStatus'),
  transactionDate: stringField(record, 'TransactionDate'),
  accountingDate: stringField(record, 'AccountingDate'),
  dueDate: stringField(record, 'DueDate'),
  businessUnit: stringField(record, 'BusinessUnit'),
  billToCustomerNumber: stringField(record, 'BillToCustomerNumber'),
  billToCustomerName: stringField(record, 'BillToCustomerName'),
  billToPartyId: idField(record, 'BillToPartyId'),
  billToSiteNumber: stringField(record, 'BillToSite'),
  transactionType: stringField(record, 'TransactionType'),
  transactionSource: stringField(record, 'TransactionSource'),
  paymentTerms: stringField(record, 'PaymentTerms'),
  purchaseOrder: stringField(record, 'PurchaseOrder'),
  ...mapTimestamps(record)
});
export const mapInvoiceParent = (client: OracleFusionClient, record: OracleRecord) => ({
  receivablesInvoiceKey: client.resourceKey(record, 'fscm', '/receivablesInvoices'),
  customerTransactionId: idField(record, 'CustomerTransactionId'),
  transactionNumber: stringField(record, 'TransactionNumber'),
  invoiceCurrency: stringField(record, 'InvoiceCurrencyCode')
});
export const mapReceivablesInvoiceLine = (
  client: OracleFusionClient,
  collection: OracleCollectionPath,
  record: OracleRecord,
  invoiceCurrency: string | undefined
) => ({
  resourceKey: client.resourceKey(record, 'fscm', collection),
  customerTransactionLineId: idField(record, 'CustomerTransactionLineId'),
  lineNumber: numberField(record, 'LineNumber'),
  invoiceCurrency,
  lineAmount: numberField(record, 'LineAmount'),
  unitSellingPrice: numberField(record, 'UnitSellingPrice'),
  quantity: numberField(record, 'Quantity'),
  unitOfMeasure: stringField(record, 'UnitOfMeasure'),
  description: stringField(record, 'Description'),
  itemNumber: stringField(record, 'ItemNumber'),
  memoLine: stringField(record, 'MemoLine'),
  taxClassificationCode: stringField(record, 'TaxClassificationCode'),
  lineAmountIncludesTax: stringField(record, 'LineAmountIncludesTax'),
  salesOrder: stringField(record, 'SalesOrder'),
  ...mapTimestamps(record)
});
export const mapReceivablesInvoiceInstallment = (
  client: OracleFusionClient,
  collection: OracleCollectionPath,
  record: OracleRecord,
  invoiceCurrency: string | undefined
) => ({
  resourceKey: client.resourceKey(record, 'fscm', collection),
  installmentId: idField(record, 'InstallmentId'),
  installmentSequenceNumber: idField(record, 'InstallmentSequenceNumber'),
  invoiceCurrency,
  originalAmount: numberField(record, 'OriginalAmount'),
  installmentBalanceDue: numberField(record, 'InstallmentBalanceDue'),
  ledgerBalanceDue: numberField(record, 'AccountedBalanceDue'),
  installmentDueDate: stringField(record, 'InstallmentDueDate'),
  installmentClosedDate: stringField(record, 'InstallmentClosedDate'),
  installmentStatus: stringField(record, 'InstallmentStatus'),
  paymentDaysLate: numberField(record, 'PaymentDaysLate'),
  disputeDate: stringField(record, 'DisputeDate'),
  ...mapTimestamps(record)
});
