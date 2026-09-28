import { allOf, SlateTool } from 'slates';
import { z } from 'zod';
import { squareServiceError } from '../lib/errors';
import { createClient, requireSquareScopes } from '../lib/helpers';
import { spec } from '../spec';

type PayoutMoney = { amount?: number; currency?: string; currency_code?: string };
type SquarePayout = {
  id: string;
  status?: string;
  location_id?: string;
  created_at?: string;
  updated_at?: string;
  amount_money?: PayoutMoney;
  destination?: { type?: string; id?: string };
  version?: number;
  type?: string;
  arrival_date?: string;
  end_to_end_id?: string;
  payout_fee?: { amount_money?: PayoutMoney; effective_at?: string; type?: string }[];
};
type SquarePayoutEntry = {
  id: string;
  payout_id?: string;
  effective_at?: string;
  type?: string;
  gross_amount_money?: PayoutMoney;
  fee_amount_money?: PayoutMoney;
  net_amount_money?: PayoutMoney;
  type_charge_details?: { payment_id?: string };
  type_refund_details?: { payment_id?: string; refund_id?: string };
  type_dispute_details?: { dispute_id?: string; payment_id?: string };
  type_fee_details?: { payment_id?: string };
};

const moneyOutput = z
  .object({ amount: z.number().optional(), currency: z.string().optional() })
  .optional();
const payoutOutput = z.object({
  payoutId: z.string(),
  status: z.string().optional(),
  locationId: z.string().optional(),
  amountMoney: moneyOutput,
  destinationType: z.string().optional(),
  destinationId: z.string().optional(),
  type: z.string().optional(),
  arrivalDate: z.string().optional(),
  endToEndId: z.string().optional(),
  version: z.number().optional(),
  fees: z
    .array(
      z.object({
        amountMoney: moneyOutput,
        effectiveAt: z.string().optional(),
        type: z.string().optional()
      })
    )
    .optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});
const entryOutput = z.object({
  payoutEntryId: z.string(),
  payoutId: z.string().optional(),
  effectiveAt: z.string().optional(),
  type: z.string().optional(),
  grossAmountMoney: moneyOutput,
  feeAmountMoney: moneyOutput,
  netAmountMoney: moneyOutput,
  paymentId: z.string().optional(),
  refundId: z.string().optional(),
  disputeId: z.string().optional()
});

const mapMoney = (money?: PayoutMoney) =>
  money && { amount: money.amount, currency: money.currency ?? money.currency_code };
const mapPayout = (p: SquarePayout) => ({
  payoutId: p.id,
  status: p.status,
  locationId: p.location_id,
  amountMoney: mapMoney(p.amount_money),
  destinationType: p.destination?.type,
  destinationId: p.destination?.id,
  type: p.type,
  arrivalDate: p.arrival_date,
  endToEndId: p.end_to_end_id,
  version: p.version,
  fees: p.payout_fee?.map(fee => ({
    amountMoney: mapMoney(fee.amount_money),
    effectiveAt: fee.effective_at,
    type: fee.type
  })),
  createdAt: p.created_at,
  updatedAt: p.updated_at
});
const mapEntry = (e: SquarePayoutEntry) => ({
  payoutEntryId: e.id,
  payoutId: e.payout_id,
  effectiveAt: e.effective_at,
  type: e.type,
  grossAmountMoney: mapMoney(e.gross_amount_money),
  feeAmountMoney: mapMoney(e.fee_amount_money),
  netAmountMoney: mapMoney(e.net_amount_money),
  paymentId:
    e.type_charge_details?.payment_id ??
    e.type_refund_details?.payment_id ??
    e.type_dispute_details?.payment_id ??
    e.type_fee_details?.payment_id,
  refundId: e.type_refund_details?.refund_id,
  disputeId: e.type_dispute_details?.dispute_id
});

export const listPayouts = SlateTool.create(spec, {
  name: 'List Payouts',
  key: 'list_payouts',
  description:
    'List payouts and their settlement amounts, status, destination, and reconciliation identifiers. Without a location ID, Square uses the default location.',
  tags: { readOnly: true }
})
  .scopes(allOf('PAYOUTS_READ'))
  .input(
    z.object({
      locationId: z
        .string()
        .optional()
        .describe('Location ID from list_locations; omission uses the default location'),
      status: z
        .enum(['SENT', 'FAILED', 'PAID'])
        .optional()
        .describe('Filter by payout status'),
      beginTime: z
        .string()
        .datetime({ offset: true })
        .optional()
        .describe('Inclusive creation time in RFC 3339 format'),
      endTime: z
        .string()
        .datetime({ offset: true })
        .optional()
        .describe('End of creation time range in RFC 3339 format'),
      sortOrder: z.enum(['ASC', 'DESC']).optional().describe('Creation-time sort order'),
      cursor: z.string().optional().describe('Cursor from a previous response'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum payouts per page, up to 100')
    })
  )
  .output(z.object({ payouts: z.array(payoutOutput), cursor: z.string().optional() }))
  .handleInvocation(async ctx => {
    requireSquareScopes(ctx.auth, ['PAYOUTS_READ']);
    let response = await createClient(ctx.auth).request<{
      payouts?: SquarePayout[];
      cursor?: string;
    }>('GET', '/payouts', {
      params: {
        location_id: ctx.input.locationId,
        status: ctx.input.status,
        begin_time: ctx.input.beginTime,
        end_time: ctx.input.endTime,
        sort_order: ctx.input.sortOrder,
        cursor: ctx.input.cursor,
        limit: ctx.input.limit
      }
    });
    let payouts = (response.payouts ?? []).map(mapPayout);
    return {
      output: { payouts, cursor: response.cursor },
      message: `Found **${payouts.length}** payout(s).`
    };
  })
  .build();

export const getPayout = SlateTool.create(spec, {
  name: 'Get Payout',
  key: 'get_payout',
  description:
    'Retrieve one payout and its settlement status, amount, destination, and reconciliation ID.',
  tags: { readOnly: true }
})
  .scopes(allOf('PAYOUTS_READ'))
  .input(z.object({ payoutId: z.string().min(1).describe('Payout ID from list_payouts') }))
  .output(payoutOutput)
  .handleInvocation(async ctx => {
    requireSquareScopes(ctx.auth, ['PAYOUTS_READ']);
    let response = await createClient(ctx.auth).request<{ payout?: SquarePayout }>(
      'GET',
      `/payouts/${encodeURIComponent(ctx.input.payoutId)}`
    );
    if (!response.payout?.id) throw squareServiceError('Square did not return a payout.');
    let output = mapPayout(response.payout);
    return {
      output,
      message: `Payout **${output.payoutId}** is **${output.status ?? 'unknown'}**.`
    };
  })
  .build();

export const listPayoutEntries = SlateTool.create(spec, {
  name: 'List Payout Entries',
  key: 'list_payout_entries',
  description:
    'List the transactions and adjustments that make up a batch payout. Each entry includes gross, fee, and net amounts with available payment, refund, or dispute IDs.',
  tags: { readOnly: true }
})
  .scopes(allOf('PAYOUTS_READ'))
  .input(
    z.object({
      payoutId: z.string().min(1).describe('Batch payout ID from list_payouts'),
      sortOrder: z.enum(['ASC', 'DESC']).optional().describe('Entry sort order'),
      cursor: z.string().optional().describe('Cursor from a previous response'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum entries per page, up to 100')
    })
  )
  .output(z.object({ payoutEntries: z.array(entryOutput), cursor: z.string().optional() }))
  .handleInvocation(async ctx => {
    requireSquareScopes(ctx.auth, ['PAYOUTS_READ']);
    let response = await createClient(ctx.auth).request<{
      payout_entries?: SquarePayoutEntry[];
      cursor?: string;
    }>('GET', `/payouts/${encodeURIComponent(ctx.input.payoutId)}/payout-entries`, {
      params: {
        sort_order: ctx.input.sortOrder,
        cursor: ctx.input.cursor,
        limit: ctx.input.limit
      }
    });
    let payoutEntries = (response.payout_entries ?? []).map(mapEntry);
    return {
      output: { payoutEntries, cursor: response.cursor },
      message: `Found **${payoutEntries.length}** payout entry or entries.`
    };
  })
  .build();
