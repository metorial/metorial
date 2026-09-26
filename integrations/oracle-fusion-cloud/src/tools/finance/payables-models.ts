import { createApiServiceError } from 'slates';
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

export const invoiceParentKey = resourceKeySchema.describe(
  'Invoice resourceKey from list_invoices, get_invoice, or create_invoice. Preserve this parent key when using its child records; do not substitute invoiceId.'
);
export const invoiceLineParentKey = resourceKeySchema.describe(
  'Invoice line resourceKey from list_invoice_lines for the same invoiceKey. Do not substitute lineNumber or reuse a key from another invoice.'
);
export const invoiceAttachmentKey = resourceKeySchema.describe(
  'Attachment resourceKey from list_invoice_attachments for the same invoiceKey. Do not substitute attachedDocumentId or reuse a key from another invoice.'
);

export const invoiceInstallmentSchema = z.object({
  resourceKey: resourceKeySchema.describe('Opaque key of this invoice installment.'),
  invoiceKey: invoiceParentKey,
  installmentNumber: z.string().optional().describe('Invoice installment number as a string.'),
  dueDate: z.string().optional().describe('Payment due date in YYYY-MM-DD format.'),
  grossAmount: z.number().optional().describe('Gross amount due in invoice currency.'),
  unpaidAmount: z
    .number()
    .optional()
    .describe('Amount remaining for payment in invoice currency.'),
  paymentMethod: z.string().optional().describe('Payment method name.'),
  paymentMethodCode: z.string().optional().describe('Oracle payment method code.'),
  paymentPriority: z.number().optional().describe('Payment priority, from 1 to 99.'),
  held: z.boolean().optional().describe('Whether the installment payment is on hold.'),
  holdReason: z
    .string()
    .optional()
    .describe('Reason for placing or releasing the payment hold.'),
  holdType: z.string().optional().describe('Whether Oracle or a user applied the hold.'),
  holdDate: z.string().optional().describe('Timestamp when the payment hold was placed.'),
  createdAt: z.string().optional().describe('Oracle creation timestamp.'),
  updatedAt: z.string().optional().describe('Oracle last-update timestamp.')
});

export const invoiceDistributionSchema = z.object({
  resourceKey: resourceKeySchema.describe('Opaque key of this invoice line distribution.'),
  invoiceKey: invoiceParentKey,
  invoiceLineKey: invoiceLineParentKey,
  invoiceDistributionId: z
    .string()
    .optional()
    .describe('Numeric distribution identifier as a string.'),
  distributionLineNumber: z
    .string()
    .optional()
    .describe('Distribution line number as a string.'),
  distributionLineType: z
    .string()
    .optional()
    .describe('Distribution line type, such as Item or Freight.'),
  amount: z.number().optional().describe('Distribution amount in invoice currency.'),
  baseAmount: z.number().optional().describe('Distribution amount in ledger currency.'),
  accountingDate: z.string().optional().describe('Accounting date in YYYY-MM-DD format.'),
  accountingStatus: z.string().optional().describe('Current distribution accounting state.'),
  distributionCombination: z.string().optional().describe('Accounting account combination.'),
  description: z.string().optional().describe('Distribution description.'),
  purchaseOrderNumber: z.string().optional().describe('Matched purchase order number.'),
  purchaseOrderLineNumber: z
    .string()
    .optional()
    .describe('Matched purchase order line number as a string.'),
  purchaseOrderScheduleLineNumber: z
    .string()
    .optional()
    .describe('Matched purchase order schedule number as a string.'),
  purchaseOrderDistributionLineNumber: z
    .string()
    .optional()
    .describe('Matched purchase order distribution number as a string.'),
  receiptNumber: z.string().optional().describe('Matched material receipt number.'),
  receiptLineNumber: z
    .string()
    .optional()
    .describe('Matched receipt line number as a string.'),
  canceled: z.boolean().optional().describe('Whether the distribution is canceled.'),
  reversed: z
    .boolean()
    .optional()
    .describe('Whether the distribution belongs to a reversal pair.'),
  trackAsAsset: z
    .boolean()
    .optional()
    .describe('Whether the item should transfer to Oracle Assets.'),
  createdAt: z.string().optional().describe('Oracle creation timestamp.'),
  updatedAt: z.string().optional().describe('Oracle last-update timestamp.')
});

export const invoiceHoldSchema = z.object({
  resourceKey: resourceKeySchema.describe('Opaque key of this invoice hold.'),
  invoiceKey: invoiceParentKey,
  invoiceId: z
    .string()
    .describe(
      'Numeric invoice identifier as a string, read from the selected invoice header.'
    ),
  holdId: z.string().optional().describe('Numeric hold identifier as a string.'),
  invoiceNumber: z.string().optional().describe('Supplier invoice number.'),
  businessUnit: z.string().optional().describe('Invoicing business unit name.'),
  supplierName: z.string().optional().describe('Supplier name on the invoice.'),
  holdName: z.string().optional().describe('Oracle hold code name.'),
  holdReason: z.string().optional().describe('Reason the hold was placed.'),
  holdDetails: z.string().optional().describe('Details of the invoice line hold.'),
  holdDate: z.string().optional().describe('Timestamp when the hold was placed.'),
  heldBy: z.string().optional().describe('User who placed the hold.'),
  lineNumber: z.string().optional().describe('Held invoice line number as a string.'),
  releaseDate: z.string().optional().describe('Timestamp when the hold was released.'),
  releaseName: z.string().optional().describe('Oracle hold release code name.'),
  releaseReason: z.string().optional().describe('Reason the hold was released.'),
  workflowStatus: z.string().optional().describe('Current hold resolution workflow state.'),
  createdAt: z.string().optional().describe('Oracle creation timestamp.'),
  updatedAt: z.string().optional().describe('Oracle last-update timestamp.')
});

export const invoiceAttachmentSchema = z.object({
  resourceKey: invoiceAttachmentKey,
  invoiceKey: invoiceParentKey,
  attachedDocumentId: z
    .string()
    .optional()
    .describe('Numeric attached document identifier as a string.'),
  fileName: z.string().optional().describe('Original filename when this is a file document.'),
  mimeType: z.string().optional().describe('Content type of the uploaded file.'),
  size: z.number().int().nonnegative().optional().describe('Known file size in bytes.'),
  type: z.string().optional().describe('Oracle document type, such as File, Text, or URL.'),
  category: z.string().optional().describe('Oracle document category.'),
  title: z.string().optional().describe('Document title.'),
  description: z.string().optional().describe('Document description.'),
  createdAt: z.string().optional().describe('Oracle creation timestamp.'),
  updatedAt: z.string().optional().describe('Oracle last-update timestamp.')
});

export const invoiceInstallmentFields = [
  'InstallmentNumber',
  'DueDate',
  'GrossAmount',
  'UnpaidAmount',
  'PaymentMethod',
  'PaymentMethodCode',
  'PaymentPriority',
  'HoldFlag',
  'HoldReason',
  'HoldType',
  'HoldDate',
  'CreationDate',
  'LastUpdateDate'
].join(',');

export const invoiceDistributionFields = [
  'InvoiceDistributionId',
  'DistributionLineNumber',
  'DistributionLineType',
  'DistributionAmount',
  'BaseAmount',
  'AccountingDate',
  'AccountingStatus',
  'DistributionCombination',
  'Description',
  'PurchaseOrderNumber',
  'PurchaseOrderLineNumber',
  'PurchaseOrderScheduleLineNumber',
  'PurchaseOrderDistributionLineNumber',
  'ReceiptNumber',
  'ReceiptLineNumber',
  'CanceledFlag',
  'ReversedFlag',
  'TrackAsAssetFlag',
  'CreationDate',
  'LastUpdateDate'
].join(',');

export const invoiceHoldFields = [
  'HoldId',
  'InvoiceNumber',
  'BusinessUnit',
  'Supplier',
  'HoldName',
  'HoldReason',
  'HoldDetails',
  'HoldDate',
  'HeldBy',
  'LineHeld',
  'ReleaseDate',
  'ReleaseName',
  'ReleaseReason',
  'WorkflowStatus',
  'CreationDate',
  'LastUpdateDate'
].join(',');

export const invoiceAttachmentFields = [
  'AttachedDocumentId',
  'FileName',
  'UploadedFileName',
  'UploadedFileContentType',
  'UploadedFileLength',
  'Type',
  'Category',
  'Title',
  'Description',
  'CreationDate',
  'LastUpdateDate'
].join(',');

export const mapInvoiceInstallment = (
  client: OracleFusionClient,
  collection: OracleCollectionPath,
  record: OracleRecord,
  invoiceKey: string
) => ({
  resourceKey: client.resourceKey(record, 'fscm', collection),
  invoiceKey,
  installmentNumber: idField(record, 'InstallmentNumber'),
  dueDate: stringField(record, 'DueDate'),
  grossAmount: numberField(record, 'GrossAmount'),
  unpaidAmount: numberField(record, 'UnpaidAmount'),
  paymentMethod: stringField(record, 'PaymentMethod'),
  paymentMethodCode: stringField(record, 'PaymentMethodCode'),
  paymentPriority: numberField(record, 'PaymentPriority'),
  held: booleanField(record, 'HoldFlag'),
  holdReason: stringField(record, 'HoldReason'),
  holdType: stringField(record, 'HoldType'),
  holdDate: stringField(record, 'HoldDate'),
  createdAt: stringField(record, 'CreationDate'),
  updatedAt: stringField(record, 'LastUpdateDate')
});

export const mapInvoiceDistribution = (
  client: OracleFusionClient,
  collection: OracleCollectionPath,
  record: OracleRecord,
  invoiceKey: string,
  invoiceLineKey: string
) => ({
  resourceKey: client.resourceKey(record, 'fscm', collection),
  invoiceKey,
  invoiceLineKey,
  invoiceDistributionId: idField(record, 'InvoiceDistributionId'),
  distributionLineNumber: idField(record, 'DistributionLineNumber'),
  distributionLineType: stringField(record, 'DistributionLineType'),
  amount: numberField(record, 'DistributionAmount'),
  baseAmount: numberField(record, 'BaseAmount'),
  accountingDate: stringField(record, 'AccountingDate'),
  accountingStatus: stringField(record, 'AccountingStatus'),
  distributionCombination: stringField(record, 'DistributionCombination'),
  description: stringField(record, 'Description'),
  purchaseOrderNumber: stringField(record, 'PurchaseOrderNumber'),
  purchaseOrderLineNumber: idField(record, 'PurchaseOrderLineNumber'),
  purchaseOrderScheduleLineNumber: idField(record, 'PurchaseOrderScheduleLineNumber'),
  purchaseOrderDistributionLineNumber: idField(record, 'PurchaseOrderDistributionLineNumber'),
  receiptNumber: stringField(record, 'ReceiptNumber'),
  receiptLineNumber: idField(record, 'ReceiptLineNumber'),
  canceled: booleanField(record, 'CanceledFlag'),
  reversed: booleanField(record, 'ReversedFlag'),
  trackAsAsset: booleanField(record, 'TrackAsAssetFlag'),
  createdAt: stringField(record, 'CreationDate'),
  updatedAt: stringField(record, 'LastUpdateDate')
});

export const mapInvoiceHold = (
  client: OracleFusionClient,
  record: OracleRecord,
  invoiceKey: string,
  invoiceId: string
) => ({
  resourceKey: client.resourceKey(record, 'fscm', '/invoiceHolds'),
  invoiceKey,
  invoiceId,
  holdId: idField(record, 'HoldId'),
  invoiceNumber: stringField(record, 'InvoiceNumber'),
  businessUnit: stringField(record, 'BusinessUnit'),
  supplierName: stringField(record, 'Supplier'),
  holdName: stringField(record, 'HoldName'),
  holdReason: stringField(record, 'HoldReason'),
  holdDetails: stringField(record, 'HoldDetails'),
  holdDate: stringField(record, 'HoldDate'),
  heldBy: stringField(record, 'HeldBy'),
  lineNumber: idField(record, 'LineHeld'),
  releaseDate: stringField(record, 'ReleaseDate'),
  releaseName: stringField(record, 'ReleaseName'),
  releaseReason: stringField(record, 'ReleaseReason'),
  workflowStatus: stringField(record, 'WorkflowStatus'),
  createdAt: stringField(record, 'CreationDate'),
  updatedAt: stringField(record, 'LastUpdateDate')
});

export const mapInvoiceAttachment = (
  client: OracleFusionClient,
  collection: OracleCollectionPath,
  record: OracleRecord,
  invoiceKey: string
) => {
  const size = numberField(record, 'UploadedFileLength');
  if (size !== undefined && (!Number.isSafeInteger(size) || size < 0)) {
    throw createApiServiceError('Oracle Fusion returned an invalid file size.', {
      reason: 'oracle_fusion_invalid_response'
    });
  }
  return {
    resourceKey: client.resourceKey(record, 'fscm', collection),
    invoiceKey,
    attachedDocumentId: idField(record, 'AttachedDocumentId'),
    fileName: stringField(record, 'FileName') ?? stringField(record, 'UploadedFileName'),
    mimeType: stringField(record, 'UploadedFileContentType'),
    size,
    type: stringField(record, 'Type'),
    category: stringField(record, 'Category'),
    title: stringField(record, 'Title'),
    description: stringField(record, 'Description'),
    createdAt: stringField(record, 'CreationDate'),
    updatedAt: stringField(record, 'LastUpdateDate')
  };
};
