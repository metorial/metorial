import { createApiServiceError } from 'slates';
import type { OracleFusionClient } from '../../lib/client';
import {
  booleanField,
  changeIndicator,
  numberField,
  type OracleRecord,
  stringField
} from '../../lib/records';
import { invoiceFields, invoiceLineFields } from './models';

const invalidInvoice = (message: string) =>
  createApiServiceError(message, { reason: 'oracle_fusion_invalid_invoice' });
const ineligibleInvoice = (message: string) =>
  createApiServiceError(message, { reason: 'oracle_fusion_invoice_ineligible' });
const normalizeState = (value: string | undefined) => value?.trim().toLowerCase();

const requireInvoiceKey = (
  client: OracleFusionClient,
  record: OracleRecord,
  invoiceKey: string
) => {
  if (client.resourceKey(record, 'fscm', '/invoices') !== invoiceKey) {
    throw ineligibleInvoice('Oracle Fusion returned a different invoice resource key.');
  }
};

const requireInvoiceIndicator = (record: OracleRecord, action: string): string => {
  const indicator = changeIndicator(record);
  if (!indicator) {
    throw ineligibleInvoice(
      `Cannot ${action} this invoice because Oracle did not return a change indicator. Re-read the invoice before requesting the operation again.`
    );
  }
  return indicator;
};

export const validateInvoiceDate = (value: string, field: string) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number(value.slice(0, 4)) < 1 ||
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw invalidInvoice(`${field} must be a valid calendar date in YYYY-MM-DD format.`);
  }
};

const decimalParts = (value: number) => {
  const numberText = value.toString();
  const exponentIndex = numberText.indexOf('e');
  const mantissa = exponentIndex === -1 ? numberText : numberText.slice(0, exponentIndex);
  const exponent = exponentIndex === -1 ? 0 : Number(numberText.slice(exponentIndex + 1));
  const [whole, fractional = ''] = mantissa.split('.');
  return { coefficient: BigInt(`${whole}${fractional}`), scale: fractional.length - exponent };
};

export const validateInvoiceAmounts = (amount: number, lines: { amount: number }[]) => {
  // Compare the decimal numbers supplied by the caller without currency-specific rounding.
  const values = [amount, ...lines.map(line => line.amount)].map(decimalParts);
  const scale = Math.max(0, ...values.map(value => value.scale));
  const integers = values.map(value => value.coefficient * 10n ** BigInt(scale - value.scale));
  const sum = integers.slice(1).reduce((total, value) => total + value, 0n);
  if (sum !== integers[0]) {
    throw invalidInvoice('The invoice amount must equal the sum of all item line amounts.');
  }
};

const requireHeaderEligibility = (record: OracleRecord, action: string) => {
  const validation = normalizeState(stringField(record, 'ValidationStatus'));
  const approval = normalizeState(stringField(record, 'ApprovalStatus'));
  const paid = normalizeState(stringField(record, 'PaidStatus'));
  const accounting = normalizeState(stringField(record, 'AccountingStatus'));
  const invoiceType = normalizeState(stringField(record, 'InvoiceType'));
  if (
    validation !== 'not validated' ||
    (approval !== 'required' && approval !== 'not required') ||
    paid !== 'unpaid' ||
    accounting !== 'unaccounted' ||
    invoiceType !== 'standard' ||
    booleanField(record, 'CanceledFlag') !== false
  ) {
    throw ineligibleInvoice(
      `Cannot ${action} this invoice. Only uncanceled Standard invoices with known Not validated, Required or Not required approval, Unpaid, and Unaccounted states are supported. Unknown or pending states are not eligible; inspect get_invoice after Oracle finishes processing.`
    );
  }
  const paidAmount = numberField(record, 'AmountPaid');
  if (paidAmount !== undefined && paidAmount !== 0) {
    throw ineligibleInvoice(`Cannot ${action} an invoice with payments.`);
  }
  if (
    !Object.hasOwn(record, 'PurchaseOrderNumber') ||
    stringField(record, 'PurchaseOrderNumber')?.trim()
  ) {
    throw ineligibleInvoice(
      `Cannot ${action} this invoice because purchase order matching is present or its state is unavailable.`
    );
  }
};

const requireLineEligibility = (record: OracleRecord, action: string) => {
  const clearFields = [
    'PurchaseOrderNumber',
    'PurchaseOrderLineNumber',
    'PurchaseOrderScheduleLineNumber',
    'ReceiptNumber',
    'ReceiptLineNumber',
    'MatchOption',
    'TaxRate',
    'TaxRateCode',
    'TaxRateName'
  ] as const;
  for (const field of clearFields) {
    if (!Object.hasOwn(record, field) || (record[field] !== null && record[field] !== '')) {
      throw ineligibleInvoice(
        `Cannot ${action} this invoice because matching or tax information is present or unavailable on an invoice line (${field}).`
      );
    }
  }
  const matchType = normalizeState(stringField(record, 'MatchType'));
  if (matchType !== 'not matched' && matchType !== 'not_matched') {
    throw ineligibleInvoice(
      `Cannot ${action} an invoice with a matched or unknown invoice line.`
    );
  }
  if (
    normalizeState(stringField(record, 'LineType')) !== 'item' ||
    booleanField(record, 'CanceledFlag') !== false ||
    booleanField(record, 'DiscardedFlag') !== false
  ) {
    throw ineligibleInvoice(
      `Cannot ${action} this invoice because only active, unmatched Item lines with no observed tax calculation are supported.`
    );
  }
};

export const getEligibleInvoice = async (
  client: OracleFusionClient,
  invoiceKey: string,
  action: string
) => {
  const first = await client.get('fscm', '/invoices', invoiceKey, {
    fields: invoiceFields,
    links: 'self'
  });
  requireInvoiceKey(client, first, invoiceKey);
  requireHeaderEligibility(first, action);
  const firstIndicator = requireInvoiceIndicator(first, action);
  const collection = client.childCollectionPath('/invoices', invoiceKey, 'invoiceLines');
  let offset = 0;
  let lineCount = 0;
  while (true) {
    const page = await client.list('fscm', collection, {
      limit: 100,
      offset,
      orderBy: 'LineNumber:asc',
      fields: invoiceLineFields,
      links: 'self'
    });
    for (const line of page.items) {
      client.resourceKey(line, 'fscm', collection);
      requireLineEligibility(line, action);
    }
    lineCount += page.items.length;
    if (!page.hasMore) break;
    if (page.nextOffset === undefined || page.nextOffset <= offset || lineCount >= 10000) {
      throw ineligibleInvoice(
        `Cannot ${action} this invoice because all invoice lines could not be safely inspected.`
      );
    }
    offset = page.nextOffset;
  }
  if (lineCount === 0)
    throw ineligibleInvoice(`Cannot ${action} an invoice with no observable item lines.`);
  // Re-read the header after the potentially paginated line inspection, immediately before mutation.
  const current = await client.get('fscm', '/invoices', invoiceKey, {
    fields: invoiceFields,
    links: 'self'
  });
  requireInvoiceKey(client, current, invoiceKey);
  requireHeaderEligibility(current, action);
  const currentIndicator = requireInvoiceIndicator(current, action);
  if (firstIndicator !== currentIndicator) {
    throw ineligibleInvoice(
      `Cannot ${action} this invoice because it changed while its lines were inspected. Re-read the invoice and review the latest state before requesting the operation again.`
    );
  }
  return current;
};
