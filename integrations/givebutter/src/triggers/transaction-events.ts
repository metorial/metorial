import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let addressSchema = z
  .object({
    address1: z.string().nullable(),
    address2: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    zipcode: z.string().nullable(),
    country: z.string().nullable()
  })
  .nullable();

let givingSpaceSchema = z
  .object({
    givingSpaceId: z.number().nullable(),
    name: z.string().nullable(),
    amount: z.number().nullable(),
    message: z.string().nullable()
  })
  .nullable();

export let transactionEvents = SlateTrigger.create(spec, {
  name: 'Transaction Succeeded',
  key: 'transaction_events',
  description:
    'Triggered when a transaction succeeds. Does not fire during CSV imports. No webhooks are available for refunds or updates.'
})
  .input(
    z.object({
      transactionId: z.string().describe('Transaction ID'),
      rawPayload: z.any().describe('Raw transaction payload')
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
      address: addressSchema.describe('Donor address'),
      status: z.string().nullable().describe('Transaction status'),
      paymentMethod: z.string().nullable().describe('Payment method'),
      amount: z.number().nullable().describe('Amount in cents'),
      fee: z.number().nullable().describe('Processing fee'),
      feeCovered: z.number().nullable().describe('Fee covered by donor'),
      donated: z.number().nullable().describe('Net donated amount'),
      payout: z.number().nullable().describe('Payout amount'),
      currency: z.string().nullable().describe('Currency code'),
      givingSpace: givingSpaceSchema.describe('Giving space details'),
      customFields: z.array(z.any()).describe('Custom field responses'),
      communicationOptIn: z.boolean().nullable().describe('Communication opt-in status'),
      transactedAt: z.string().nullable().describe('When the transaction occurred'),
      createdAt: z.string().nullable().describe('When created')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      if (body.event !== 'transaction.succeeded') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            transactionId: String(body.data.id),
            rawPayload: body.data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let d = ctx.input.rawPayload;

      let address = d.address
        ? {
            address1: d.address.address_1 ?? null,
            address2: d.address.address_2 ?? null,
            city: d.address.city ?? null,
            state: d.address.state ?? null,
            zipcode: d.address.zipcode ?? null,
            country: d.address.country ?? null
          }
        : null;

      let givingSpace = d.giving_space
        ? {
            givingSpaceId: d.giving_space.id ?? null,
            name: d.giving_space.name ?? null,
            amount: d.giving_space.amount ?? null,
            message: d.giving_space.message ?? null
          }
        : null;

      return {
        type: 'transaction.succeeded',
        id: `transaction-${ctx.input.transactionId}-${d.created_at ?? Date.now()}`,
        output: {
          transactionId: ctx.input.transactionId,
          campaignId: d.campaign_id ?? null,
          campaignCode: d.campaign_code ?? null,
          planId: d.plan_id ? String(d.plan_id) : null,
          teamId: d.team_id ? String(d.team_id) : null,
          memberId: d.member_id ? String(d.member_id) : null,
          fundId: d.fund_id ? String(d.fund_id) : null,
          firstName: d.first_name ?? null,
          lastName: d.last_name ?? null,
          email: d.email ?? null,
          phone: d.phone ?? null,
          company: d.company ?? null,
          address,
          status: d.status ?? null,
          paymentMethod: d.method ?? null,
          amount: d.amount ?? null,
          fee: d.fee ?? null,
          feeCovered: d.fee_covered ?? null,
          donated: d.donated ?? null,
          payout: d.payout ?? null,
          currency: d.currency ?? null,
          givingSpace,
          customFields: d.custom_fields ?? [],
          communicationOptIn: d.communication_opt_in ?? null,
          transactedAt: d.transacted_at ?? null,
          createdAt: d.created_at ?? null
        }
      };
    }
  })
  .build();
