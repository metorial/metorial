import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let lineItemSchema = z.object({
  type: z.string().nullable().describe('Line item type (e.g. donation)'),
  subtype: z.string().nullable().describe('Line item subtype'),
  description: z.string().nullable().describe('Description'),
  quantity: z.number().nullable().describe('Quantity'),
  price: z.number().nullable().describe('Price'),
  discount: z.number().nullable().describe('Discount'),
  total: z.number().nullable().describe('Total')
});

let subTransactionSchema = z.object({
  subTransactionId: z.string().describe('Sub-transaction ID'),
  planId: z.string().nullable().describe('Associated plan ID'),
  amount: z.number().nullable().describe('Amount'),
  fee: z.number().nullable().describe('Fee'),
  feeCovered: z.number().nullable().describe('Fee covered'),
  donated: z.number().nullable().describe('Donated amount'),
  payout: z.number().nullable().describe('Payout amount'),
  captured: z.boolean().nullable().describe('Whether captured'),
  capturedAt: z.string().nullable().describe('When captured'),
  refunded: z.boolean().nullable().describe('Whether refunded'),
  lineItems: z.array(lineItemSchema).describe('Line items')
});

export let getTransaction = SlateTool.create(spec, {
  name: 'Get Transaction',
  key: 'get_transaction',
  description: `Retrieve detailed information about a specific transaction including donor details, payment info, line items, giving space, and custom fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      transactionId: z.string().describe('ID of the transaction to retrieve')
    })
  )
  .output(
    z.object({
      transactionId: z.string().describe('Transaction ID'),
      campaignId: z.number().nullable().describe('Campaign ID'),
      campaignCode: z.string().nullable().describe('Campaign code'),
      planId: z.string().nullable().describe('Recurring plan ID'),
      teamId: z.string().nullable().describe('Team ID'),
      memberId: z.string().nullable().describe('Member ID'),
      fundId: z.string().nullable().describe('Fund ID'),
      firstName: z.string().nullable().describe('Donor first name'),
      lastName: z.string().nullable().describe('Donor last name'),
      email: z.string().nullable().describe('Donor email'),
      phone: z.string().nullable().describe('Donor phone'),
      company: z.string().nullable().describe('Donor company'),
      address: z
        .object({
          address1: z.string().nullable(),
          address2: z.string().nullable(),
          city: z.string().nullable(),
          state: z.string().nullable(),
          zipcode: z.string().nullable(),
          country: z.string().nullable()
        })
        .nullable()
        .describe('Donor address'),
      status: z.string().nullable().describe('Transaction status'),
      paymentMethod: z.string().nullable().describe('Payment method'),
      amount: z.number().nullable().describe('Total amount (in cents)'),
      fee: z.number().nullable().describe('Processing fee'),
      feeCovered: z.number().nullable().describe('Fee covered by donor'),
      donated: z.number().nullable().describe('Net donated amount'),
      payout: z.number().nullable().describe('Payout amount'),
      currency: z.string().nullable().describe('Currency code'),
      givingSpace: z
        .object({
          givingSpaceId: z.number().nullable(),
          name: z.string().nullable(),
          amount: z.number().nullable(),
          message: z.string().nullable()
        })
        .nullable()
        .describe('Giving space details'),
      subTransactions: z
        .array(subTransactionSchema)
        .describe('Sub-transactions with line items'),
      customFields: z.array(z.any()).describe('Custom field responses'),
      utmParameters: z.array(z.any()).describe('UTM parameters'),
      transactedAt: z.string().nullable().describe('When the transaction occurred'),
      createdAt: z.string().nullable().describe('When created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let t = await client.getTransaction(ctx.input.transactionId);

    let address = t.address
      ? {
          address1: t.address.address_1 ?? null,
          address2: t.address.address_2 ?? null,
          city: t.address.city ?? null,
          state: t.address.state ?? null,
          zipcode: t.address.zipcode ?? null,
          country: t.address.country ?? null
        }
      : null;

    let givingSpace = t.giving_space
      ? {
          givingSpaceId: t.giving_space.id ?? null,
          name: t.giving_space.name ?? null,
          amount: t.giving_space.amount ?? null,
          message: t.giving_space.message ?? null
        }
      : null;

    let subTransactions = (t.transactions ?? []).map((st: any) => ({
      subTransactionId: String(st.id),
      planId: st.plan_id ? String(st.plan_id) : null,
      amount: st.amount ?? null,
      fee: st.fee ?? null,
      feeCovered: st.fee_covered ?? null,
      donated: st.donated ?? null,
      payout: st.payout ?? null,
      captured: st.captured ?? null,
      capturedAt: st.captured_at ?? null,
      refunded: st.refunded ?? null,
      lineItems: (st.line_items ?? []).map((li: any) => ({
        type: li.type ?? null,
        subtype: li.subtype ?? null,
        description: li.description ?? li.title ?? null,
        quantity: li.quantity ?? null,
        price: li.price ?? null,
        discount: li.discount ?? null,
        total: li.total ?? null
      }))
    }));

    return {
      output: {
        transactionId: String(t.id),
        campaignId: t.campaign_id ?? null,
        campaignCode: t.campaign_code ?? null,
        planId: t.plan_id ? String(t.plan_id) : null,
        teamId: t.team_id ? String(t.team_id) : null,
        memberId: t.member_id ? String(t.member_id) : null,
        fundId: t.fund_id ? String(t.fund_id) : null,
        firstName: t.first_name ?? null,
        lastName: t.last_name ?? null,
        email: t.email ?? null,
        phone: t.phone ?? null,
        company: t.company ?? null,
        address,
        status: t.status ?? null,
        paymentMethod: t.method ?? null,
        amount: t.amount ?? null,
        fee: t.fee ?? null,
        feeCovered: t.fee_covered ?? null,
        donated: t.donated ?? null,
        payout: t.payout ?? null,
        currency: t.currency ?? null,
        givingSpace,
        subTransactions,
        customFields: t.custom_fields ?? [],
        utmParameters: t.utm_parameters ?? [],
        transactedAt: t.transacted_at ?? null,
        createdAt: t.created_at ?? null
      },
      message: `Retrieved transaction **${t.id}** — ${t.amount ?? 0} ${t.currency ?? 'USD'} from ${[t.first_name, t.last_name].filter(Boolean).join(' ') || 'unknown donor'}.`
    };
  })
  .build();
