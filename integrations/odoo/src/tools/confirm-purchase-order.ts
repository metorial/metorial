import { buildApiServiceError, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

const PURCHASE_ORDER_MODEL = 'purchase.order';
const MAX_CONTEXT_DEPTH = 20;
const READBACK_FIELDS = [
  'id',
  'name',
  'state',
  'date_approve',
  'partner_id',
  'amount_total',
  'currency_id',
  'company_id'
];
const UNCHANGED_STATES = new Set(['draft', 'sent', 'cancel']);

type JsonRecord = Record<string, unknown>;
type PurchaseOrderState = 'purchase' | 'done' | 'to approve';

interface NormalizedValue {
  ok: true;
  value: unknown;
}

interface InvalidValue {
  ok: false;
}

type NormalizationResult = NormalizedValue | InvalidValue;

interface ConfirmPurchaseOrderOutput {
  purchaseOrderId: number;
  name: string;
  state: PurchaseOrderState;
  status: 'confirmed' | 'submitted_for_approval';
  followUpRequired: boolean;
  dateApprove: string | null;
  partnerId: number;
  partnerName: string | null;
  amountTotal: number;
  currencyId: number;
  currencyName: string | null;
  companyId: number;
  companyName: string | null;
}

let jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string().min(1), jsonValueSchema)
  ])
);

let invalidConfirmInput = (message: string, reason: string) =>
  createApiServiceError(message, { reason });

let isPlainRecord = (value: object): value is JsonRecord => {
  let prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

let normalizeJsonValue = (
  value: unknown,
  depth: number,
  ancestors: Set<object>
): NormalizationResult => {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return { ok: true, value };
  }
  if (typeof value !== 'object' || depth >= MAX_CONTEXT_DEPTH || ancestors.has(value)) {
    return { ok: false };
  }

  ancestors.add(value);
  if (Array.isArray(value)) {
    let keys = Reflect.ownKeys(value);
    if (
      keys.length !== value.length + 1 ||
      !keys.includes('length') ||
      !keys.every(
        key =>
          key === 'length' ||
          (typeof key === 'string' && /^(0|[1-9]\d*)$/.test(key) && Number(key) < value.length)
      )
    ) {
      ancestors.delete(value);
      return { ok: false };
    }

    let normalized: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      let descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
        ancestors.delete(value);
        return { ok: false };
      }
      let item = normalizeJsonValue(descriptor.value, depth + 1, ancestors);
      if (!item.ok) {
        ancestors.delete(value);
        return item;
      }
      normalized.push(item.value);
    }
    ancestors.delete(value);
    return { ok: true, value: normalized };
  }

  if (!isPlainRecord(value)) {
    ancestors.delete(value);
    return { ok: false };
  }

  let normalizedKeys = new Set<string>();
  let normalizedEntries: [string, unknown][] = [];
  for (let key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') {
      ancestors.delete(value);
      return { ok: false };
    }
    let descriptor = Object.getOwnPropertyDescriptor(value, key);
    let normalizedKey = key.trim();
    if (
      normalizedKey === '' ||
      normalizedKeys.has(normalizedKey) ||
      !descriptor?.enumerable ||
      !Object.hasOwn(descriptor, 'value')
    ) {
      ancestors.delete(value);
      return { ok: false };
    }
    let item = normalizeJsonValue(descriptor.value, depth + 1, ancestors);
    if (!item.ok) {
      ancestors.delete(value);
      return item;
    }
    normalizedKeys.add(normalizedKey);
    normalizedEntries.push([normalizedKey, item.value]);
  }
  ancestors.delete(value);
  return { ok: true, value: Object.fromEntries(normalizedEntries) };
};

let normalizePurchaseOrderId = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw invalidConfirmInput(
      'Purchase order ID must be a positive integer.',
      'odoo_confirm_purchase_order_id_invalid'
    );
  }
  return value;
};

let normalizeContext = (value: unknown): JsonRecord | undefined => {
  if (value === undefined) return undefined;

  let normalized: NormalizationResult;
  try {
    normalized =
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      isPlainRecord(value)
        ? normalizeJsonValue(value, 0, new Set())
        : { ok: false };
  } catch {
    normalized = { ok: false };
  }
  if (!normalized.ok || typeof normalized.value !== 'object' || normalized.value === null) {
    throw invalidConfirmInput(
      `Odoo context must be a plain JSON object with non-empty keys, finite values, and at most ${MAX_CONTEXT_DEPTH} levels of nesting.`,
      'odoo_confirm_purchase_order_context_invalid'
    );
  }
  return normalized.value as JsonRecord;
};

let requireText = (value: unknown, field: string) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw createApiServiceError(
      `Odoo returned an invalid ${field} while verifying the purchase order confirmation.`,
      { reason: 'odoo_confirm_purchase_order_readback_invalid' }
    );
  }
  return value;
};

let requireFiniteNumber = (value: unknown, field: string) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw createApiServiceError(
      `Odoo returned an invalid ${field} while verifying the purchase order confirmation.`,
      { reason: 'odoo_confirm_purchase_order_readback_invalid' }
    );
  }
  return value;
};

let requireManyToOne = (
  value: unknown,
  field: string
): { id: number; name: string | null } => {
  let id = typeof value === 'number' ? value : Array.isArray(value) ? value[0] : undefined;
  let name = Array.isArray(value) && typeof value[1] === 'string' ? value[1] : null;
  if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
    throw createApiServiceError(
      `Odoo returned an invalid ${field} while verifying the purchase order confirmation.`,
      { reason: 'odoo_confirm_purchase_order_readback_invalid' }
    );
  }
  return { id, name };
};

let requireDateApprove = (value: unknown, state: PurchaseOrderState) => {
  if (value === false || value === null) {
    if (state === 'to approve') return null;
  } else if (typeof value === 'string' && value.trim() !== '') {
    return value;
  }

  throw createApiServiceError(
    'Odoo returned an invalid confirmation date while verifying the purchase order confirmation.',
    { reason: 'odoo_confirm_purchase_order_readback_invalid' }
  );
};

let requireResultingState = (value: unknown, purchaseOrderId: number): PurchaseOrderState => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw createApiServiceError(
      'Odoo returned an invalid purchase order state after the confirmation request.',
      { reason: 'odoo_confirm_purchase_order_state_invalid' }
    );
  }

  if (value === 'purchase' || value === 'done' || value === 'to approve') {
    return value;
  }
  if (UNCHANGED_STATES.has(value)) {
    throw createApiServiceError(
      `Odoo did not confirm purchase order #${purchaseOrderId}; it remains in state \`${value}\`. Confirm only a draft or sent request for quotation with valid order lines, and verify the connected user has Purchase access.`,
      { reason: 'odoo_confirm_purchase_order_not_confirmed' }
    );
  }

  throw createApiServiceError(
    `Odoo returned unsupported purchase order state \`${value}\` after the confirmation request. Refresh the order and verify the installed Purchase workflow before retrying.`,
    { reason: 'odoo_confirm_purchase_order_state_invalid' }
  );
};

let requirePurchaseOrder = (
  value: unknown,
  requestedId: number
): ConfirmPurchaseOrderOutput => {
  if (
    !Array.isArray(value) ||
    value.length !== 1 ||
    typeof value[0] !== 'object' ||
    value[0] === null ||
    Array.isArray(value[0])
  ) {
    throw createApiServiceError(
      'Odoo did not return exactly one purchase order while verifying the confirmation.',
      { reason: 'odoo_confirm_purchase_order_readback_invalid' }
    );
  }

  let record = value[0] as JsonRecord;
  if (record.id !== requestedId) {
    throw createApiServiceError(
      'Odoo returned a different purchase order while verifying the confirmation.',
      { reason: 'odoo_confirm_purchase_order_readback_invalid' }
    );
  }

  let state = requireResultingState(record.state, requestedId);
  let partner = requireManyToOne(record.partner_id, 'vendor relationship');
  let currency = requireManyToOne(record.currency_id, 'currency relationship');
  let company = requireManyToOne(record.company_id, 'company relationship');
  let followUpRequired = state === 'to approve';

  return {
    purchaseOrderId: requestedId,
    name: requireText(record.name, 'purchase order reference'),
    state,
    status: followUpRequired ? 'submitted_for_approval' : 'confirmed',
    followUpRequired,
    dateApprove: requireDateApprove(record.date_approve, state),
    partnerId: partner.id,
    partnerName: partner.name,
    amountTotal: requireFiniteNumber(record.amount_total, 'purchase order total'),
    currencyId: currency.id,
    currencyName: currency.name,
    companyId: company.id,
    companyName: company.name
  };
};

export let confirmPurchaseOrder = SlateTool.create(spec, {
  name: 'Confirm Purchase Order',
  key: 'confirm_purchase_order',
  description:
    'Confirm one Odoo request for quotation as a purchase order, or submit it for required approval, and return the verified resulting state and order details.',
  instructions: [
    'Use the exact positive purchase.order record ID for a draft or sent request for quotation with valid order lines.',
    'Odoo may confirm the order immediately or move it to `to approve` when the company uses purchase approval thresholds.',
    'When `followUpRequired` is true, an authorized approver must approve the order before it is confirmed.',
    'The tool reads the order back after the action and uses that state instead of relying on the method return value.'
  ],
  constraints: [
    'Requires the Odoo Purchase module and permission to read and confirm the target purchase order.',
    'Confirmation can trigger receipts, stock operations, notifications, and other automation configured in Odoo.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      purchaseOrderId: z
        .number()
        .int()
        .positive()
        .describe('Positive Odoo purchase.order record ID to confirm'),
      context: z
        .record(z.string().min(1), jsonValueSchema)
        .optional()
        .describe(
          'Optional Odoo context, such as {"lang":"en_US"} or {"allowed_company_ids":[1,2]}'
        )
    })
  )
  .output(
    z.object({
      purchaseOrderId: z.number().int().positive().describe('Odoo purchase.order ID'),
      name: z.string().min(1).describe('Purchase order reference'),
      state: z
        .enum(['purchase', 'done', 'to approve'])
        .describe('Verified resulting purchase order state'),
      status: z
        .enum(['confirmed', 'submitted_for_approval'])
        .describe('Whether the order is confirmed or awaiting approval'),
      followUpRequired: z
        .boolean()
        .describe('Whether an authorized approver must still approve the order'),
      dateApprove: z
        .string()
        .min(1)
        .nullable()
        .describe('Confirmation date and time, or null while awaiting approval'),
      partnerId: z.number().int().positive().describe('Vendor record ID'),
      partnerName: z.string().nullable().describe('Vendor display name when returned by Odoo'),
      amountTotal: z.number().finite().describe('Current purchase order total'),
      currencyId: z.number().int().positive().describe('Currency record ID'),
      currencyName: z
        .string()
        .nullable()
        .describe('Currency display name when returned by Odoo'),
      companyId: z.number().int().positive().describe('Company record ID'),
      companyName: z.string().nullable().describe('Company display name when returned by Odoo')
    })
  )
  .handleInvocation(async ctx => {
    let purchaseOrderId = normalizePurchaseOrderId(ctx.input.purchaseOrderId);
    let context = normalizeContext(ctx.input.context);

    let purchaseOrder: ConfirmPurchaseOrderOutput;
    try {
      let client = createClient(ctx);
      await client.callRecordMethod({
        model: PURCHASE_ORDER_MODEL,
        method: 'button_confirm',
        ids: [purchaseOrderId],
        arguments: context === undefined ? undefined : { context },
        legacyKeywordArguments: context === undefined ? undefined : { context }
      });

      let readArguments = {
        fields: READBACK_FIELDS,
        load: null,
        ...(context === undefined ? {} : { context })
      };
      let readback = await client.callRecordMethod({
        model: PURCHASE_ORDER_MODEL,
        method: 'read',
        ids: [purchaseOrderId],
        arguments: readArguments,
        legacyKeywordArguments: readArguments
      });
      purchaseOrder = requirePurchaseOrder(readback, purchaseOrderId);
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Odoo',
        operation: `confirming purchase order #${purchaseOrderId}`,
        reason: 'odoo_confirm_purchase_order_failed'
      });
    }

    if (purchaseOrder.followUpRequired) {
      return {
        output: purchaseOrder,
        message: `Submitted Odoo purchase order **${purchaseOrder.name}** (#${purchaseOrderId}) for approval.`
      };
    }

    return {
      output: purchaseOrder,
      message: `Confirmed Odoo purchase order **${purchaseOrder.name}** (#${purchaseOrderId}) in state \`${purchaseOrder.state}\`.`
    };
  })
  .build();
