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

let getTransactionOutputSchema = z.object({
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
  subTransactions: z.array(subTransactionSchema).describe('Sub-transactions with line items'),
  customFields: z.array(z.any()).describe('Custom field responses'),
  utmParameters: z.array(z.any()).describe('UTM parameters'),
  transactedAt: z.string().nullable().describe('When the transaction occurred'),
  createdAt: z.string().nullable().describe('When created')
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
  .output(getTransactionOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let t = await client.getTransaction(ctx.input.transactionId);

    let address = t.address
      ? {
          address1: t.address.address_1,
          address2: t.address.address_2,
          city: t.address.city,
          state: t.address.state,
          zipcode: t.address.zipcode,
          country: t.address.country
        }
      : t.address;

    let givingSpace = t.giving_space
      ? {
          givingSpaceId: t.giving_space.id,
          name: t.giving_space.name,
          amount: t.giving_space.amount,
          message: client.publicData(t.giving_space.message)
        }
      : t.giving_space;

    let subTransactions = client.array(t.transactions).map((st: any) => ({
      subTransactionId: String(st.id),
      planId: client.nullableId(st.plan_id),
      amount: st.amount,
      fee: st.fee,
      feeCovered: st.fee_covered,
      donated: st.donated,
      payout: st.payout,
      captured: st.captured,
      capturedAt: st.captured_at,
      refunded: st.refunded,
      lineItems: client.array(st.line_items).map((li: any) => ({
        type: li.type,
        subtype: li.subtype,
        description: li.description === undefined ? li.title : li.description,
        quantity: li.quantity,
        price: li.price,
        discount: li.discount,
        total: li.total
      }))
    }));

    return {
      output: client.output(getTransactionOutputSchema, {
        transactionId: String(t.id),
        campaignId: t.campaign_id,
        campaignCode: t.campaign_code,
        planId: client.nullableId(t.plan_id),
        teamId: client.nullableId(t.team_id),
        memberId: client.nullableId(t.member_id),
        fundId: client.nullableId(t.fund_id),
        firstName: t.first_name,
        lastName: t.last_name,
        email: t.email,
        phone: t.phone,
        company: t.company,
        address,
        status: t.status,
        paymentMethod: t.method,
        amount: t.amount,
        fee: t.fee,
        feeCovered: t.fee_covered,
        donated: t.donated,
        payout: t.payout,
        currency: t.currency,
        givingSpace,
        subTransactions,
        customFields: t.custom_fields,
        utmParameters: t.utm_parameters,
        transactedAt: t.transacted_at,
        createdAt: t.created_at
      }),
      message: client.publicData(`Retrieved transaction **${t.id}**.`)
    };
  })
  .build();
