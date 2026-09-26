import { z } from 'zod';
import type { OracleCollectionPath, OracleFusionClient } from '../../lib/client';
import {
  booleanField,
  idField,
  numberField,
  type OracleRecord,
  stringField
} from '../../lib/records';
import { resourceKeySchema } from '../../lib/schemas';

export const invoiceSchema = z.object({
  resourceKey: resourceKeySchema,
  invoiceId: z
    .string()
    .optional()
    .describe(
      'Numeric invoice identifier, distinct from the resource key used in follow-up tools.'
    ),
  invoiceNumber: z.string().optional().describe('Supplier invoice number.'),
  currency: z.string().optional().describe('Invoice currency code.'),
  amount: z.number().optional().describe('Invoice amount in invoice currency.'),
  invoiceDate: z.string().optional().describe('Supplier invoice date in YYYY-MM-DD format.'),
  accountingDate: z.string().optional().describe('Accounting date in YYYY-MM-DD format.'),
  businessUnit: z.string().optional().describe('Invoicing business unit name.'),
  supplierName: z.string().optional().describe('Supplier name.'),
  supplierNumber: z.string().optional().describe('Supplier business number.'),
  supplierSite: z.string().optional().describe('Supplier site name.'),
  description: z.string().optional().describe('Invoice description.'),
  invoiceType: z.string().optional().describe('Oracle invoice type, such as Standard.'),
  validationStatus: z
    .string()
    .optional()
    .describe('Current invoice validation state; absent when Oracle has not populated it.'),
  approvalStatus: z
    .string()
    .optional()
    .describe('Current invoice approval state; absent when Oracle has not populated it.'),
  paidStatus: z.string().optional().describe('Current invoice payment state.'),
  accountingStatus: z.string().optional().describe('Current invoice accounting state.'),
  canceled: z.boolean().optional().describe('Whether the invoice is canceled.'),
  amountPaid: z.number().optional().describe('Amount already paid against the invoice.'),
  purchaseOrderNumber: z
    .string()
    .optional()
    .describe('Purchase order number identified on the invoice header, when present.'),
  createdAt: z.string().optional().describe('Oracle creation timestamp.'),
  updatedAt: z.string().optional().describe('Oracle last-update timestamp.')
});

export const invoiceLineSchema = z.object({
  resourceKey: resourceKeySchema,
  lineNumber: z
    .string()
    .optional()
    .describe('Invoice line number represented as a string, distinct from its resource key.'),
  amount: z.number().optional().describe('Line amount in invoice currency.'),
  lineType: z
    .string()
    .optional()
    .describe('Oracle line type, such as Item, Freight, or Miscellaneous.'),
  description: z.string().optional().describe('Invoice line description.'),
  accountingDate: z.string().optional().describe('Line accounting date in YYYY-MM-DD format.'),
  distributionCombination: z
    .string()
    .optional()
    .describe('Accounting account combination for the line.'),
  quantity: z.number().optional().describe('Quantity invoiced.'),
  unitPrice: z.number().optional().describe('Price per unit.'),
  purchaseOrderNumber: z
    .string()
    .optional()
    .describe('Purchase order matched to this line, when present.'),
  receiptNumber: z.string().optional().describe('Receipt matched to this line, when present.'),
  matchType: z.string().optional().describe('Oracle match type for this line.'),
  matchOption: z
    .string()
    .optional()
    .describe('Oracle purchase order or receipt matching option.'),
  taxRate: z.number().optional().describe('Tax rate returned by Oracle, when present.'),
  taxRateCode: z
    .string()
    .optional()
    .describe('Tax rate code returned by Oracle, when present.'),
  taxRateName: z
    .string()
    .optional()
    .describe('Tax rate name returned by Oracle, when present.'),
  canceled: z.boolean().optional().describe('Whether the line is canceled.'),
  discarded: z.boolean().optional().describe('Whether the line has been discarded.')
});

export const businessUnitSchema = z.object({
  resourceKey: resourceKeySchema,
  businessUnitId: z
    .string()
    .optional()
    .describe('Business unit identifier, distinct from its resource key.'),
  businessUnitName: z
    .string()
    .optional()
    .describe('Business unit name to pass as businessUnit when creating an invoice.'),
  active: z.boolean().optional().describe('Whether the business unit is active.'),
  legalEntityId: z.string().optional().describe('Associated legal entity identifier.'),
  primaryLedgerId: z.string().optional().describe('Associated primary ledger identifier.'),
  locationId: z.string().optional().describe('Associated location identifier.')
});

export const invoiceFields = [
  'InvoiceId',
  'InvoiceNumber',
  'InvoiceCurrency',
  'InvoiceAmount',
  'InvoiceDate',
  'AccountingDate',
  'BusinessUnit',
  'Supplier',
  'SupplierNumber',
  'SupplierSite',
  'Description',
  'InvoiceType',
  'ValidationStatus',
  'ApprovalStatus',
  'PaidStatus',
  'AccountingStatus',
  'CanceledFlag',
  'AmountPaid',
  'PurchaseOrderNumber',
  'CreationDate',
  'LastUpdateDate'
].join(',');

export const invoiceLineFields = [
  'LineNumber',
  'LineAmount',
  'LineType',
  'Description',
  'AccountingDate',
  'DistributionCombination',
  'Quantity',
  'UnitPrice',
  'PurchaseOrderNumber',
  'PurchaseOrderLineNumber',
  'PurchaseOrderScheduleLineNumber',
  'ReceiptNumber',
  'ReceiptLineNumber',
  'MatchType',
  'MatchOption',
  'TaxRate',
  'TaxRateCode',
  'TaxRateName',
  'CanceledFlag',
  'DiscardedFlag'
].join(',');

export const mapInvoice = (client: OracleFusionClient, record: OracleRecord) => ({
  resourceKey: client.resourceKey(record, 'fscm', '/invoices'),
  invoiceId: idField(record, 'InvoiceId'),
  invoiceNumber: stringField(record, 'InvoiceNumber'),
  currency: stringField(record, 'InvoiceCurrency'),
  amount: numberField(record, 'InvoiceAmount'),
  invoiceDate: stringField(record, 'InvoiceDate'),
  accountingDate: stringField(record, 'AccountingDate'),
  businessUnit: stringField(record, 'BusinessUnit'),
  supplierName: stringField(record, 'Supplier'),
  supplierNumber: stringField(record, 'SupplierNumber'),
  supplierSite: stringField(record, 'SupplierSite'),
  description: stringField(record, 'Description'),
  invoiceType: stringField(record, 'InvoiceType'),
  validationStatus: stringField(record, 'ValidationStatus'),
  approvalStatus: stringField(record, 'ApprovalStatus'),
  paidStatus: stringField(record, 'PaidStatus'),
  accountingStatus: stringField(record, 'AccountingStatus'),
  canceled: booleanField(record, 'CanceledFlag'),
  amountPaid: numberField(record, 'AmountPaid'),
  purchaseOrderNumber: stringField(record, 'PurchaseOrderNumber'),
  createdAt: stringField(record, 'CreationDate'),
  updatedAt: stringField(record, 'LastUpdateDate')
});

export const mapInvoiceLine = (
  client: OracleFusionClient,
  collection: OracleCollectionPath,
  record: OracleRecord
) => ({
  resourceKey: client.resourceKey(record, 'fscm', collection),
  lineNumber: idField(record, 'LineNumber'),
  amount: numberField(record, 'LineAmount'),
  lineType: stringField(record, 'LineType'),
  description: stringField(record, 'Description'),
  accountingDate: stringField(record, 'AccountingDate'),
  distributionCombination: stringField(record, 'DistributionCombination'),
  quantity: numberField(record, 'Quantity'),
  unitPrice: numberField(record, 'UnitPrice'),
  purchaseOrderNumber: stringField(record, 'PurchaseOrderNumber'),
  receiptNumber: stringField(record, 'ReceiptNumber'),
  matchType: stringField(record, 'MatchType'),
  matchOption: stringField(record, 'MatchOption'),
  taxRate: numberField(record, 'TaxRate'),
  taxRateCode: stringField(record, 'TaxRateCode'),
  taxRateName: stringField(record, 'TaxRateName'),
  canceled: booleanField(record, 'CanceledFlag'),
  discarded: booleanField(record, 'DiscardedFlag')
});

export const mapBusinessUnit = (client: OracleFusionClient, record: OracleRecord) => ({
  resourceKey: client.resourceKey(record, 'fscm', '/finBusinessUnitsLOV'),
  businessUnitId: idField(record, 'BusinessUnitId'),
  businessUnitName: stringField(record, 'BusinessUnitName'),
  active: booleanField(record, 'ActiveFlag'),
  legalEntityId: idField(record, 'LegalEntityId'),
  primaryLedgerId: idField(record, 'PrimaryLedgerId'),
  locationId: idField(record, 'LocationId')
});
