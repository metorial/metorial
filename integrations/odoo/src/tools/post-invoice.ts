import { buildApiServiceError, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

const INVOICE_MODEL = 'account.move';
const INVOICE_MOVE_TYPES = ['out_invoice', 'out_refund', 'in_invoice', 'in_refund'] as const;
const INVOICE_MOVE_TYPE_SET = new Set<string>(INVOICE_MOVE_TYPES);
const PREFLIGHT_FIELDS = ['id', 'move_type', 'state'];
const READBACK_FIELDS = [
  'id',
  'name',
  'move_type',
  'state',
  'payment_state',
  'partner_id',
  'invoice_date',
  'amount_total',
  'amount_residual',
  'currency_id'
];
const MAX_CONTEXT_DEPTH = 20;

type InvoiceMoveType = (typeof INVOICE_MOVE_TYPES)[number];
type JsonRecord = Record<string, unknown>;

interface PostedInvoice {
  invoiceId: number;
  name: string;
  moveType: InvoiceMoveType;
  state: 'posted';
  paymentState: string | null;
  partnerId: number;
  partnerName: string | null;
  invoiceDate: string | null;
  amountTotal: number;
  amountResidual: number;
  currencyId: number;
  currencyName: string | null;
}

let invalidPostInput = (message: string, reason: string) =>
  createApiServiceError(message, { reason });

let isPlainRecord = (value: unknown): value is JsonRecord => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  let prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

let isJsonCompatible = (value: unknown, depth = 0, ancestors = new Set<object>()): boolean => {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return true;
  }
  if (depth >= MAX_CONTEXT_DEPTH || typeof value !== 'object' || ancestors.has(value)) {
    return false;
  }

  ancestors.add(value);
  let compatible = Array.isArray(value)
    ? value.every(item => isJsonCompatible(item, depth + 1, ancestors))
    : isPlainRecord(value) &&
      Object.values(value).every(item => isJsonCompatible(item, depth + 1, ancestors));
  ancestors.delete(value);
  return compatible;
};

let normalizeInvoiceId = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw invalidPostInput(
      'Invoice ID must be a positive integer.',
      'odoo_post_invoice_id_invalid'
    );
  }
  return value;
};

let normalizeContext = (value: unknown): JsonRecord | undefined => {
  if (value === undefined) return undefined;
  if (!isPlainRecord(value) || !isJsonCompatible(value)) {
    throw invalidPostInput(
      `Odoo context must be a plain JSON object with at most ${MAX_CONTEXT_DEPTH} levels of nesting.`,
      'odoo_post_invoice_context_invalid'
    );
  }
  return { ...value };
};

let requireOneRecord = (value: unknown, invoiceId: number, phase: string): JsonRecord => {
  if (!Array.isArray(value) || value.length !== 1 || !isPlainRecord(value[0])) {
    throw createApiServiceError(`Odoo did not return exactly one invoice while ${phase}.`, {
      reason: 'odoo_post_invoice_readback_invalid'
    });
  }
  if (value[0].id !== invoiceId) {
    throw createApiServiceError(`Odoo returned a different invoice while ${phase}.`, {
      reason: 'odoo_post_invoice_readback_invalid'
    });
  }
  return value[0];
};

let requireText = (value: unknown, field: string) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw createApiServiceError(
      `Odoo returned an invalid ${field} while verifying the posted invoice.`,
      { reason: 'odoo_post_invoice_readback_invalid' }
    );
  }
  return value;
};

let optionalText = (value: unknown, field: string) => {
  if (value === false || value === null || value === undefined) return null;
  if (typeof value !== 'string' || value.trim() === '') {
    throw createApiServiceError(
      `Odoo returned an invalid ${field} while verifying the posted invoice.`,
      { reason: 'odoo_post_invoice_readback_invalid' }
    );
  }
  return value;
};

let requireFiniteNumber = (value: unknown, field: string) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw createApiServiceError(
      `Odoo returned an invalid ${field} while verifying the posted invoice.`,
      { reason: 'odoo_post_invoice_readback_invalid' }
    );
  }
  return value;
};

let requireManyToOne = (
  value: unknown,
  field: string
): { id: number; name: string | null } => {
  let id = typeof value === 'number' ? value : Array.isArray(value) ? value[0] : undefined;
  let name =
    Array.isArray(value) && typeof value[1] === 'string' && value[1].trim() !== ''
      ? value[1]
      : null;
  if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
    throw createApiServiceError(
      `Odoo returned an invalid ${field} while verifying the posted invoice.`,
      { reason: 'odoo_post_invoice_readback_invalid' }
    );
  }
  return { id, name };
};

let requireInvoiceMoveType = (value: unknown, invoiceId: number): InvoiceMoveType => {
  if (typeof value !== 'string') {
    throw createApiServiceError('Odoo returned an invalid invoice document type.', {
      reason: 'odoo_post_invoice_readback_invalid'
    });
  }
  if (!INVOICE_MOVE_TYPE_SET.has(value)) {
    throw createApiServiceError(
      `Odoo account.move #${invoiceId} is not a customer invoice, customer credit note, vendor bill, or vendor credit note. Use a journal-entry-specific workflow for document type \`${value}\`.`,
      { reason: 'odoo_post_invoice_move_type_unsupported' }
    );
  }
  return value as InvoiceMoveType;
};

let requireDraftInvoice = (value: unknown, invoiceId: number) => {
  let record = requireOneRecord(value, invoiceId, 'checking whether it can be posted');
  requireInvoiceMoveType(record.move_type, invoiceId);
  let state = requireText(record.state, 'invoice state');
  if (state !== 'draft') {
    throw createApiServiceError(
      `Odoo invoice #${invoiceId} cannot be posted because it is in state \`${state}\`. Post only a draft invoice or vendor bill.`,
      { reason: 'odoo_post_invoice_state_invalid' }
    );
  }
};

let requirePostedInvoice = (value: unknown, invoiceId: number): PostedInvoice => {
  let record = requireOneRecord(value, invoiceId, 'verifying the posting result');
  let moveType = requireInvoiceMoveType(record.move_type, invoiceId);
  let state = requireText(record.state, 'invoice state');
  if (state !== 'posted') {
    throw createApiServiceError(
      `Odoo did not post invoice or bill #${invoiceId}; it remains in state \`${state}\`. Posting may require completing a confirmation or validation wizard, or the document may be incomplete, cancelled, inaccessible, or invalid for this transition. Review the document in Odoo before retrying.`,
      { reason: 'odoo_post_invoice_not_posted' }
    );
  }

  let partner = requireManyToOne(record.partner_id, 'customer or vendor relationship');
  let currency = requireManyToOne(record.currency_id, 'currency relationship');
  return {
    invoiceId,
    name: requireText(record.name, 'invoice number'),
    moveType,
    state,
    paymentState: optionalText(record.payment_state, 'payment state'),
    partnerId: partner.id,
    partnerName: partner.name,
    invoiceDate: optionalText(record.invoice_date, 'invoice date'),
    amountTotal: requireFiniteNumber(record.amount_total, 'invoice total'),
    amountResidual: requireFiniteNumber(record.amount_residual, 'invoice amount due'),
    currencyId: currency.id,
    currencyName: currency.name
  };
};

let documentLabel = (moveType: InvoiceMoveType) => {
  switch (moveType) {
    case 'out_invoice':
      return 'customer invoice';
    case 'out_refund':
      return 'customer credit note';
    case 'in_invoice':
      return 'vendor bill';
    case 'in_refund':
      return 'vendor credit note';
  }
};

let readArguments = (fields: string[], context: JsonRecord | undefined) => ({
  fields,
  load: null,
  ...(context === undefined ? {} : { context })
});

export let postInvoice = SlateTool.create(spec, {
  name: 'Post Invoice',
  key: 'post_invoice',
  description:
    'Post one draft Odoo customer invoice, customer credit note, vendor bill, or vendor credit note and return its verified accounting and payment state, partner, date, amounts, and currency.',
  instructions: [
    'Use the exact positive account.move record ID for a draft invoice or vendor bill document.',
    'Posting finalizes the accounting entry, assigns its official number, and can trigger taxes, electronic invoicing, follow-up, automation, or other accounting workflows configured in Odoo.',
    'The tool reads the document back after the action and succeeds only when Odoo reports its state as `posted`.'
  ],
  constraints: [
    'Requires the Odoo Accounting or Invoicing module and permission to read and post the target document.',
    'Does not post miscellaneous journal entries or receipts. Use an accounting workflow designed for those document types.',
    'Posting is a mutating accounting action and is not safely repeatable for an already posted or cancelled document.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      invoiceId: z
        .number()
        .int()
        .positive()
        .describe('Positive Odoo account.move ID of the draft invoice or vendor bill to post'),
      context: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Optional Odoo context, such as {"lang":"en_US"} or {"allowed_company_ids":[1,2]}'
        )
    })
  )
  .output(
    z.object({
      invoiceId: z.number().int().positive().describe('Posted Odoo account.move ID'),
      name: z.string().min(1).describe('Official invoice or bill number'),
      moveType: z
        .enum(INVOICE_MOVE_TYPES)
        .describe('Odoo invoice document type that was posted'),
      state: z.literal('posted').describe('Verified resulting accounting state'),
      paymentState: z
        .string()
        .min(1)
        .nullable()
        .describe('Current Odoo payment state, when available'),
      partnerId: z.number().int().positive().describe('Customer or vendor record ID'),
      partnerName: z
        .string()
        .nullable()
        .describe('Customer or vendor display name when returned by Odoo'),
      invoiceDate: z.string().min(1).nullable().describe('Invoice or bill date, when set'),
      amountTotal: z.number().finite().describe('Current invoice or bill total'),
      amountResidual: z.number().finite().describe('Current unpaid amount'),
      currencyId: z.number().int().positive().describe('Currency record ID'),
      currencyName: z
        .string()
        .nullable()
        .describe('Currency display name when returned by Odoo')
    })
  )
  .handleInvocation(async ctx => {
    let invoiceId = normalizeInvoiceId(ctx.input.invoiceId);
    let context = normalizeContext(ctx.input.context);

    let postedInvoice: PostedInvoice;
    try {
      let client = createClient(ctx);
      let preflightArguments = readArguments(PREFLIGHT_FIELDS, context);
      let preflight = await client.callRecordMethod({
        model: INVOICE_MODEL,
        method: 'read',
        ids: [invoiceId],
        arguments: preflightArguments,
        legacyKeywordArguments: preflightArguments
      });
      requireDraftInvoice(preflight, invoiceId);

      await client.callRecordMethod({
        model: INVOICE_MODEL,
        method: 'action_post',
        ids: [invoiceId],
        arguments: context === undefined ? undefined : { context },
        legacyKeywordArguments: context === undefined ? undefined : { context }
      });

      let postReadArguments = readArguments(READBACK_FIELDS, context);
      let readback = await client.callRecordMethod({
        model: INVOICE_MODEL,
        method: 'read',
        ids: [invoiceId],
        arguments: postReadArguments,
        legacyKeywordArguments: postReadArguments
      });
      postedInvoice = requirePostedInvoice(readback, invoiceId);
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Odoo',
        operation: `posting invoice #${invoiceId}`,
        reason: 'odoo_post_invoice_failed'
      });
    }

    return {
      output: postedInvoice,
      message: `Posted Odoo ${documentLabel(postedInvoice.moveType)} **${postedInvoice.name}** (#${invoiceId}) with payment state \`${postedInvoice.paymentState ?? 'unavailable'}\`.`
    };
  })
  .build();
