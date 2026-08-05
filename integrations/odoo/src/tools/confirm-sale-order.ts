import { buildApiServiceError, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

const SALE_ORDER_MODEL = 'sale.order';
const CONFIRMED_STATES = new Set(['sale', 'done']);
const READBACK_FIELDS = [
  'id',
  'name',
  'state',
  'date_order',
  'partner_id',
  'amount_total',
  'currency_id'
];
const MAX_CONTEXT_DEPTH = 20;

type JsonRecord = Record<string, unknown>;

interface ConfirmedSaleOrder {
  saleOrderId: number;
  name: string;
  state: 'sale' | 'done';
  dateOrder: string;
  partnerId: number;
  partnerName: string | null;
  amountTotal: number;
  currencyId: number;
  currencyName: string | null;
}

let invalidConfirmInput = (message: string, reason: string) =>
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

let normalizeSaleOrderId = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw invalidConfirmInput(
      'Sale order ID must be a positive integer.',
      'odoo_confirm_sale_order_id_invalid'
    );
  }
  return value;
};

let normalizeContext = (value: unknown): JsonRecord | undefined => {
  if (value === undefined) return undefined;
  if (!isPlainRecord(value) || !isJsonCompatible(value)) {
    throw invalidConfirmInput(
      `Odoo context must be a plain JSON object with at most ${MAX_CONTEXT_DEPTH} levels of nesting.`,
      'odoo_confirm_sale_order_context_invalid'
    );
  }
  return { ...value };
};

let requireActionResult = (value: unknown) => {
  if (typeof value !== 'boolean') {
    throw createApiServiceError(
      'Odoo returned an invalid result while confirming the sale order.',
      { reason: 'odoo_confirm_sale_order_response_invalid' }
    );
  }
  return value;
};

let requireText = (value: unknown, field: string) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw createApiServiceError(
      `Odoo returned an invalid ${field} while reading back the confirmed sale order.`,
      { reason: 'odoo_confirm_sale_order_readback_invalid' }
    );
  }
  return value;
};

let requireFiniteNumber = (value: unknown, field: string) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw createApiServiceError(
      `Odoo returned an invalid ${field} while reading back the confirmed sale order.`,
      { reason: 'odoo_confirm_sale_order_readback_invalid' }
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
      `Odoo returned an invalid ${field} while reading back the confirmed sale order.`,
      { reason: 'odoo_confirm_sale_order_readback_invalid' }
    );
  }
  return { id, name };
};

let requireConfirmedOrder = (
  value: unknown,
  requestedId: number,
  actionSucceeded: boolean
): ConfirmedSaleOrder => {
  if (!Array.isArray(value) || value.length !== 1 || !isPlainRecord(value[0])) {
    throw createApiServiceError(
      'Odoo did not return exactly one sale order while verifying the confirmation.',
      { reason: 'odoo_confirm_sale_order_readback_invalid' }
    );
  }

  let record = value[0];
  if (record.id !== requestedId) {
    throw createApiServiceError(
      'Odoo returned a different sale order while verifying the confirmation.',
      { reason: 'odoo_confirm_sale_order_readback_invalid' }
    );
  }

  let state = requireText(record.state, 'sale order state');
  if (!CONFIRMED_STATES.has(state)) {
    let status = `\`${state}\``;
    throw createApiServiceError(
      actionSucceeded
        ? `Odoo reported that sale order #${requestedId} was confirmed, but it remains in state ${status}. Refresh the order and verify its confirmation requirements before retrying.`
        : `Odoo did not confirm sale order #${requestedId}; it remains in state ${status}. Confirm only a draft or sent quotation with valid order lines, and verify the connected user has Sales access.`,
      {
        reason: actionSucceeded
          ? 'odoo_confirm_sale_order_transition_not_applied'
          : 'odoo_confirm_sale_order_not_confirmed'
      }
    );
  }

  let partner = requireManyToOne(record.partner_id, 'customer relationship');
  let currency = requireManyToOne(record.currency_id, 'currency relationship');
  return {
    saleOrderId: requestedId,
    name: requireText(record.name, 'sale order reference'),
    state: state as 'sale' | 'done',
    dateOrder: requireText(record.date_order, 'confirmation date'),
    partnerId: partner.id,
    partnerName: partner.name,
    amountTotal: requireFiniteNumber(record.amount_total, 'sale order total'),
    currencyId: currency.id,
    currencyName: currency.name
  };
};

export let confirmSaleOrder = SlateTool.create(spec, {
  name: 'Confirm Sale Order',
  key: 'confirm_sale_order',
  description:
    'Confirm one Odoo sales quotation as a sales order and return its verified current state, confirmation date, customer, total, and currency.',
  instructions: [
    'This changes a draft or sent quotation into a sales order and can trigger downstream inventory, delivery, project, email, or automation workflows configured in Odoo.',
    'Use the exact positive sale.order record ID. Odoo rejects cancelled, already confirmed, incomplete, or inaccessible orders.',
    'The tool reads the order back after the action and succeeds only when its resulting state is `sale` or `done`.'
  ],
  constraints: [
    'Requires the Odoo Sales module and permission to read and confirm the target sale order.',
    'Confirmation is a mutating business action and is not safely repeatable for an already confirmed order.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      saleOrderId: z
        .number()
        .int()
        .positive()
        .describe('Positive Odoo sale.order record ID to confirm'),
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
      saleOrderId: z.number().int().positive().describe('Confirmed Odoo sale.order ID'),
      name: z.string().min(1).describe('Sale order reference'),
      state: z.enum(['sale', 'done']).describe('Verified resulting sales order state'),
      dateOrder: z.string().min(1).describe('Confirmation date and time returned by Odoo'),
      partnerId: z.number().int().positive().describe('Customer record ID'),
      partnerName: z
        .string()
        .nullable()
        .describe('Customer display name when returned by Odoo'),
      amountTotal: z.number().finite().describe('Current sale order total'),
      currencyId: z.number().int().positive().describe('Currency record ID'),
      currencyName: z
        .string()
        .nullable()
        .describe('Currency display name when returned by Odoo')
    })
  )
  .handleInvocation(async ctx => {
    let saleOrderId = normalizeSaleOrderId(ctx.input.saleOrderId);
    let context = normalizeContext(ctx.input.context);

    let confirmedOrder: ConfirmedSaleOrder;
    try {
      let client = createClient(ctx);
      let actionResult = requireActionResult(
        await client.callRecordMethod({
          model: SALE_ORDER_MODEL,
          method: 'action_confirm',
          ids: [saleOrderId],
          arguments: context === undefined ? undefined : { context },
          legacyKeywordArguments: context === undefined ? undefined : { context }
        })
      );

      let readArguments = {
        fields: READBACK_FIELDS,
        load: null,
        ...(context === undefined ? {} : { context })
      };
      let readback = await client.callRecordMethod({
        model: SALE_ORDER_MODEL,
        method: 'read',
        ids: [saleOrderId],
        arguments: readArguments,
        legacyKeywordArguments: readArguments
      });
      confirmedOrder = requireConfirmedOrder(readback, saleOrderId, actionResult);
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Odoo',
        operation: `confirming sale order #${saleOrderId}`,
        reason: 'odoo_confirm_sale_order_failed'
      });
    }

    return {
      output: confirmedOrder,
      message: `Confirmed Odoo sale order **${confirmedOrder.name}** (#${saleOrderId}) in state \`${confirmedOrder.state}\`.`
    };
  })
  .build();
