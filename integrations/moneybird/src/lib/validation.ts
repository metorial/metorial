import { ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus,
  isApiErrorRecord
} from 'slates';
import type { z } from 'zod';

const hasControlCharacter = (value: string) =>
  Array.from(value).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);
export const fail = (message: string) =>
  createApiServiceError(message, { reason: 'moneybird.invalid_input' });
export const invalidResponse = () =>
  createApiServiceError(
    'Moneybird returned incomplete or inconsistent data. Reconcile any attempted change before retrying.',
    { reason: 'moneybird.invalid_response' }
  );
const object = (value: unknown): Record<string, unknown> =>
  isApiErrorRecord(value) ? value : {};
export const safeMoneybirdError = (error: unknown) => {
  if (
    error instanceof ServiceError &&
    typeof error.data.reason === 'string' &&
    error.data.reason.startsWith('moneybird.')
  )
    return error;
  const baggage = object(object(object(error).data).baggage);
  const extracted =
    object(baggage.serviceErrorData).upstreamStatus ??
    (error instanceof ServiceError ? error.data.upstreamStatus : undefined) ??
    getApiErrorStatus(error);
  const status =
    typeof extracted === 'number'
      ? extracted
      : typeof extracted === 'string' && /^\d{3}$/.test(extracted)
        ? Number(extracted)
        : undefined;
  return buildApiServiceError(
    { response: { status: status && status >= 100 && status <= 599 ? status : undefined } },
    {
      providerLabel: 'Moneybird',
      reason: 'moneybird.upstream_error',
      parent: {},
      extractMessage: () =>
        'The request could not be confirmed. Check access, input and service availability. Reconcile attempted changes before retrying; changes are never automatically retried.'
    }
  );
};
export const exactId = (value: unknown): string => {
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) return value;
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0)
    return String(value);
  throw invalidResponse();
};
export const nullableId = (value: unknown): string | null =>
  value === null || value === undefined ? null : exactId(value);
export const pathValue = (value: string): string => {
  if (!value.trim() || hasControlCharacter(value))
    throw fail('Provide a nonblank resource ID or lookup value.');
  return encodeURIComponent(value);
};
export const administration = (value: string | undefined): string => {
  if (!value || !/^[1-9]\d*$/.test(value))
    throw fail(
      'Call list_administrations and select an authorized administrationId for this tool, or save it as the default administration.'
    );
  return value;
};
export const validateToken = (value: string) => {
  if (!value?.trim() || /\s/.test(value) || hasControlCharacter(value))
    throw fail('Reconnect with a valid Moneybird bearer token.');
};
export const parseProviderJson = (raw: unknown): unknown => {
  if (typeof raw !== 'string' || !raw.trim()) return raw;
  try {
    return JSON.parse(raw, ((key: string, value: unknown, context?: { source?: string }) => {
      if (
        (key === 'id' || key.endsWith('_id')) &&
        typeof value === 'number' &&
        !Number.isSafeInteger(value)
      ) {
        if (!context?.source || !/^[1-9]\d*$/.test(context.source)) throw invalidResponse();
        return context.source;
      }
      return value;
    }) as Parameters<typeof JSON.parse>[1]);
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw invalidResponse();
  }
};
export const scrubResponse = (value: unknown, token: string): unknown => {
  if (typeof value === 'string') return value.replaceAll(token, '[redacted]');
  if (Array.isArray(value)) return value.map(item => scrubResponse(item, token));
  if (!isApiErrorRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key]) =>
          !/^(?:access_token|refresh_token|client_secret|authorization|password|api_key)$/i.test(
            key
          )
      )
      .map(([key, item]) => [key, scrubResponse(item, token)])
  );
};
export const checkedOutput = async <S extends z.ZodType>(
  schema: S,
  action: () => Promise<{ output: unknown; message: string } | undefined>
): Promise<{ output: z.output<S>; message: string }> => {
  try {
    const result = await action();
    if (!result) throw invalidResponse();
    const parsed = schema.safeParse(result.output);
    if (!parsed.success) throw invalidResponse();
    const inspect = (value: unknown): void => {
      if (Array.isArray(value)) {
        for (const item of value) inspect(item);
      } else if (isApiErrorRecord(value))
        for (const [key, item] of Object.entries(value)) {
          if (
            item !== null &&
            item !== undefined &&
            /^(?:price|amount|amountDecimal|percentage|totalPriceExclTax|totalPriceInclTax|totalPaid|totalUnpaid|amountOpen)$/.test(
              key
            ) &&
            !(key === 'amount' && typeof value.lineItemId === 'string') &&
            (typeof item !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(item))
          )
            throw invalidResponse();
          if (
            key === 'budget' &&
            item !== null &&
            item !== undefined &&
            !Number.isSafeInteger(item)
          )
            throw invalidResponse();
          inspect(item);
        }
    };
    inspect(parsed.data);
    return { output: parsed.data, message: result.message };
  } catch (error) {
    throw safeMoneybirdError(error);
  }
};
const dateFields = new Set([
  'invoiceDate',
  'dueDate',
  'estimateDate',
  'paymentDate',
  'sepaMandateDate'
]);
export const validateToolInput = (key: string, input: Record<string, unknown>) => {
  const walk = (value: Record<string, unknown>) => {
    for (const [field, item] of Object.entries(value)) {
      if (item === undefined || item === null) continue;
      if (
        field.endsWith('Id') &&
        !['customerId', 'accountId', 'sepaMandateId'].includes(field) &&
        (typeof item !== 'string' || !/^[1-9]\d*$/.test(item))
      )
        throw fail(`Provide a valid ${field} from the corresponding list or get tool.`);
      if (
        ['price', 'priceBase', 'paymentAmount', 'discount'].includes(field) &&
        (typeof item !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(item))
      )
        throw fail(`${field} must be an exact decimal string without a currency symbol.`);
      if (
        field === 'amount' &&
        (typeof item !== 'string' || !item.trim() || hasControlCharacter(item))
      )
        throw fail('amount must be nonblank provider quantity text, such as "1" or "1 x".');
      if (
        ['page', 'perPage', 'frequency', 'desiredCount'].includes(field) &&
        (!Number.isSafeInteger(item) ||
          Number(item) < 1 ||
          (field === 'perPage' && Number(item) > 100))
      )
        throw fail(
          `${field} must be a positive integer${field === 'perPage' ? ' no greater than 100' : ''}.`
        );
      if (field === 'budget' && (!Number.isSafeInteger(item) || Number(item) < 0))
        throw fail('budget must be a nonnegative safe integer or null.');
      if (
        field === 'period' &&
        typeof item === 'string' &&
        (/[,:]/.test(item) || hasControlCharacter(item))
      )
        throw fail(
          'period must be one provider period value; use a documented period or date range.'
        );
      if (field === 'currency' && (typeof item !== 'string' || !/^[A-Z]{3}$/.test(item)))
        throw fail('currency must be an uppercase three-letter code.');
      if (
        dateFields.has(field) &&
        (typeof item !== 'string' ||
          !/^\d{4}-\d{2}-\d{2}$/.test(item) ||
          !Number.isFinite(Date.parse(item)) ||
          new Date(`${item}T00:00:00Z`).toISOString().slice(0, 10) !== item)
      )
        throw fail(`${field} must be a valid YYYY-MM-DD calendar date.`);
      if (
        ['startedAt', 'endedAt'].includes(field) &&
        (typeof item !== 'string' ||
          !/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(item) ||
          !Number.isFinite(Date.parse(item)))
      )
        throw fail(`${field} must be a valid ISO timestamp with a timezone.`);
      if (Array.isArray(item)) {
        if (field === 'lineItems' && !item.length)
          throw fail('Supply at least one line item.');
        for (const entry of item) if (isApiErrorRecord(entry)) walk(entry);
      } else if (isApiErrorRecord(item)) walk(item);
    }
  };
  walk(input);
  if (Array.isArray(input.lineItems))
    for (const item of input.lineItems)
      if (isApiErrorRecord(item) && item.remove === true && !item.lineItemId)
        throw fail('Removing a recurring line item requires its existing lineItemId.');
  if (
    key === 'manage_recurring_invoices' &&
    input.action === 'create' &&
    Array.isArray(input.lineItems) &&
    input.lineItems.some(
      item =>
        isApiErrorRecord(item) && (item.lineItemId !== undefined || item.remove !== undefined)
    )
  )
    throw fail(
      'Create recurring invoices with new line items; existing line IDs and remove apply only to update.'
    );
  const requireFields = (...fields: string[]) => {
    for (const field of fields)
      if (input[field] === undefined || input[field] === '' || input[field] === null)
        throw fail(`${field} is required for this operation.`);
  };
  const exactlyOne = (a: string, b: string) => {
    if ((input[a] !== undefined) === (input[b] !== undefined))
      throw fail(`Provide exactly one of ${a} or ${b}.`);
  };
  if (key === 'get_contact') exactlyOne('contactId', 'customerId');
  if (key === 'get_sales_invoice') exactlyOne('salesInvoiceId', 'invoiceNumber');
  if (key === 'create_contact' && !input.companyName && !input.firstName && !input.lastName)
    throw fail('Supply companyName, firstName or lastName.');
  const action = input.action;
  const ids: Record<string, string> = {
    manage_products: 'productId',
    manage_ledger_accounts: 'ledgerAccountId',
    manage_projects: 'projectId',
    manage_time_entries: 'timeEntryId',
    manage_recurring_invoices: 'recurringInvoiceId'
  };
  if (ids[key] && ['get', 'update', 'delete'].includes(String(action))) {
    if (key === 'manage_products' && action === 'get') exactlyOne('productId', 'identifier');
    else requireFields(ids[key] ?? 'resourceId');
  }
  if (action === 'create') {
    if (key === 'manage_recurring_invoices')
      requireFields('contactId', 'invoiceDate', 'frequencyType', 'frequency', 'lineItems');
    if (key === 'manage_time_entries') requireFields('startedAt', 'endedAt');
    if (key === 'manage_projects') requireFields('name');
    if (key === 'manage_ledger_accounts') requireFields('name', 'accountType');
  }
  const branchFields: Record<string, Record<string, readonly string[]>> = {
    manage_sales_invoice: {
      update: ['updateFields'],
      send: ['sendMethod', 'emailAddress'],
      registerPayment: ['paymentAmount', 'paymentDate'],
      createCredit: [],
      pause: [],
      resume: [],
      delete: []
    },
    manage_estimate: {
      send: ['sendMethod', 'emailAddress'],
      changeState: ['newState'],
      bill: [],
      delete: []
    },
    manage_products: {
      list: ['query', 'currency', 'page', 'perPage'],
      get: ['productId', 'identifier'],
      create: [
        'identifier',
        'description',
        'title',
        'price',
        'taxRateId',
        'ledgerAccountId',
        'frequency',
        'frequencyType'
      ],
      update: [
        'productId',
        'identifier',
        'description',
        'title',
        'price',
        'taxRateId',
        'ledgerAccountId',
        'frequency',
        'frequencyType'
      ],
      delete: ['productId']
    },
    manage_ledger_accounts: {
      list: [],
      get: ['ledgerAccountId'],
      create: ['name', 'accountType', 'accountId', 'parentId'],
      update: ['ledgerAccountId', 'name', 'accountId', 'parentId'],
      delete: ['ledgerAccountId']
    },
    manage_projects: {
      list: ['filter', 'page', 'perPage'],
      get: ['projectId'],
      create: ['name', 'budget'],
      update: ['projectId', 'name', 'budget'],
      delete: ['projectId']
    },
    manage_time_entries: {
      list: ['filter', 'query', 'page', 'perPage'],
      get: ['timeEntryId'],
      create: [
        'startedAt',
        'endedAt',
        'description',
        'contactId',
        'projectId',
        'billable',
        'userId'
      ],
      update: [
        'timeEntryId',
        'startedAt',
        'endedAt',
        'description',
        'contactId',
        'projectId',
        'billable',
        'userId'
      ],
      delete: ['timeEntryId']
    },
    manage_recurring_invoices: {
      list: ['filter', 'page', 'perPage'],
      get: ['recurringInvoiceId'],
      create: [
        'contactId',
        'invoiceDate',
        'frequencyType',
        'frequency',
        'autoSend',
        'currency',
        'reference',
        'hasDesiredCount',
        'desiredCount',
        'workflowId',
        'lineItems'
      ],
      update: [
        'recurringInvoiceId',
        'invoiceDate',
        'frequencyType',
        'frequency',
        'autoSend',
        'currency',
        'reference',
        'hasDesiredCount',
        'desiredCount',
        'workflowId',
        'lineItems'
      ],
      delete: ['recurringInvoiceId']
    }
  };
  const allowed = branchFields[key]?.[String(action)];
  if (allowed)
    for (const [field, item] of Object.entries(input))
      if (
        item !== undefined &&
        !['action', 'administrationId', 'salesInvoiceId', 'estimateId'].includes(field) &&
        !allowed.includes(field)
      )
        throw fail(
          `${field} is not used by the ${action} operation. Remove it before retrying.`
        );
  if (
    action === 'update' &&
    allowed &&
    !allowed.some(field => !field.endsWith('Id') && input[field] !== undefined) &&
    ![
      'manage_time_entries',
      'manage_recurring_invoices',
      'manage_products',
      'manage_ledger_accounts'
    ].some(
      k => k === key && allowed.some(field => field !== ids[key] && input[field] !== undefined)
    )
  )
    throw fail('Supply at least one field to update.');
  if (
    key === 'manage_sales_invoice' &&
    action === 'update' &&
    (!isApiErrorRecord(input.updateFields) ||
      !Object.values(input.updateFields).some(v => v !== undefined))
  )
    throw fail('Supply at least one updateFields value.');
  if (key === 'manage_sales_invoice' && action === 'registerPayment')
    requireFields('paymentAmount', 'paymentDate');
  if (key === 'manage_estimate' && action === 'changeState') requireFields('newState');
  if (
    typeof input.startedAt === 'string' &&
    typeof input.endedAt === 'string' &&
    Date.parse(input.startedAt) >= Date.parse(input.endedAt)
  )
    throw fail('endedAt must be later than startedAt.');
  if (key === 'update_contact') {
    if (input.archive && input.remove) throw fail('Choose archive or remove.');
    const fields = Object.keys(input).filter(
      f =>
        !['contactId', 'administrationId', 'archive', 'remove'].includes(f) &&
        input[f] !== undefined
    );
    if ((input.archive || input.remove) && fields.length)
      throw fail('Archive or remove separately from profile updates.');
    if (!input.archive && !input.remove && !fields.length)
      throw fail('Supply a profile field, archive or remove.');
  }
  if (key === 'link_booking') {
    const types = ['Payment', 'LedgerAccountBooking'];
    if (input.unlink && !types.includes(String(input.bookingType)))
      throw fail(
        'Unlink using the actual Payment or LedgerAccountBooking ID, not an invoice or document ID.'
      );
    if (!input.unlink && input.bookingType === 'LedgerAccountBooking')
      throw fail(
        'Link a SalesInvoice, Document, LedgerAccount, ExternalSalesInvoice or Payment; LedgerAccountBooking identifies an existing booking for unlinking.'
      );
    if (
      !input.unlink &&
      input.bookingType === 'Payment' &&
      ['price', 'priceBase', 'description', 'projectId'].some(f => input[f] !== undefined)
    )
      throw fail(
        'Payment linking uses the existing payment amount; omit amount and ledger-only options.'
      );
    if (
      input.unlink &&
      ['price', 'priceBase', 'description', 'projectId'].some(f => input[f] !== undefined)
    )
      throw fail('Unlink accepts only the existing booking type and ID.');
    if (
      !input.unlink &&
      input.bookingType === 'LedgerAccount' &&
      input.priceBase === undefined &&
      input.price === undefined
    )
      throw fail(
        'Ledger account booking requires priceBase, or the legacy price field as an exact base-currency amount.'
      );
    if (
      input.bookingType === 'LedgerAccount' &&
      input.price !== undefined &&
      input.priceBase !== undefined &&
      input.price !== input.priceBase
    )
      throw fail(
        'For a ledger account, price and priceBase must agree; only the base-currency amount is used.'
      );
  }
};
