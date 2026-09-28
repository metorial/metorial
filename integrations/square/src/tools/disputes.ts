import { allOf, SlateTool } from 'slates';
import { z } from 'zod';
import { squareServiceError } from '../lib/errors';
import { createClient, requireSquareScopes } from '../lib/helpers';
import { spec } from '../spec';

type SquareDispute = {
  id: string;
  amount_money?: { amount?: number; currency?: string };
  reason?: string;
  state?: string;
  due_at?: string;
  disputed_payment?: { payment_id?: string };
  card_brand?: string;
  brand_dispute_id?: string;
  location_id?: string;
  reported_at?: string;
  created_at?: string;
  updated_at?: string;
  version?: number;
};

const disputeOutput = z.object({
  disputeId: z.string(),
  paymentId: z.string().optional(),
  locationId: z.string().optional(),
  state: z.string().optional(),
  reason: z.string().optional(),
  amountMoney: z
    .object({ amount: z.number().optional(), currency: z.string().optional() })
    .optional(),
  dueAt: z.string().optional(),
  reportedAt: z.string().optional(),
  cardBrand: z.string().optional(),
  brandDisputeId: z.string().optional(),
  version: z.number().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

const mapDispute = (d: SquareDispute) => ({
  disputeId: d.id,
  paymentId: d.disputed_payment?.payment_id,
  locationId: d.location_id,
  state: d.state,
  reason: d.reason,
  amountMoney: d.amount_money,
  dueAt: d.due_at,
  reportedAt: d.reported_at,
  cardBrand: d.card_brand,
  brandDisputeId: d.brand_dispute_id,
  version: d.version,
  createdAt: d.created_at,
  updatedAt: d.updated_at
});

const disputeState = z.enum([
  'INQUIRY_EVIDENCE_REQUIRED',
  'INQUIRY_PROCESSING',
  'INQUIRY_CLOSED',
  'EVIDENCE_REQUIRED',
  'PROCESSING',
  'WON',
  'LOST',
  'ACCEPTED'
]);

export const listDisputes = SlateTool.create(spec, {
  name: 'List Disputes',
  key: 'list_disputes',
  description:
    'List payment disputes, including the disputed payment, amount, state, and response deadline.',
  tags: { readOnly: true }
})
  .scopes(allOf('DISPUTES_READ'))
  .input(
    z.object({
      locationId: z.string().optional().describe('Optional location ID from list_locations'),
      state: disputeState.optional().describe('Filter by one dispute state'),
      cursor: z.string().optional().describe('Cursor from a previous response')
    })
  )
  .output(z.object({ disputes: z.array(disputeOutput), cursor: z.string().optional() }))
  .handleInvocation(async ctx => {
    requireSquareScopes(ctx.auth, ['DISPUTES_READ']);
    let response = await createClient(ctx.auth).request<{
      disputes?: SquareDispute[];
      cursor?: string;
    }>('GET', '/disputes', {
      params: {
        location_id: ctx.input.locationId,
        states: ctx.input.state,
        cursor: ctx.input.cursor
      }
    });
    let disputes = (response.disputes ?? []).map(mapDispute);
    return {
      output: { disputes, cursor: response.cursor },
      message: `Found **${disputes.length}** dispute(s).`
    };
  })
  .build();

export const getDispute = SlateTool.create(spec, {
  name: 'Get Dispute',
  key: 'get_dispute',
  description:
    'Retrieve the state, disputed payment, amount, reason, and response deadline for one dispute.',
  tags: { readOnly: true }
})
  .scopes(allOf('DISPUTES_READ'))
  .input(z.object({ disputeId: z.string().min(1).describe('Dispute ID from list_disputes') }))
  .output(disputeOutput)
  .handleInvocation(async ctx => {
    requireSquareScopes(ctx.auth, ['DISPUTES_READ']);
    let response = await createClient(ctx.auth).request<{ dispute?: SquareDispute }>(
      'GET',
      `/disputes/${encodeURIComponent(ctx.input.disputeId)}`
    );
    if (!response.dispute?.id) throw squareServiceError('Square did not return a dispute.');
    let output = mapDispute(response.dispute);
    return {
      output,
      message: `Dispute **${output.disputeId}** is **${output.state ?? 'unknown'}**${output.dueAt ? `; response due **${output.dueAt}**` : ''}.`
    };
  })
  .build();
