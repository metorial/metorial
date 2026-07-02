import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let prepaidTransactionSchema = z
  .object({
    transactionUuid: z.string().optional().describe('UUID of the prepaid transaction'),
    amountInCents: z.number().optional().describe('Transaction amount in cents'),
    balanceInCents: z.number().optional().describe('New balance after transaction'),
    contactUuid: z.string().optional().describe('UUID of the contact'),
    shopUuid: z.string().optional().describe('UUID of the shop'),
    createdAt: z.string().optional().describe('Creation timestamp')
  })
  .passthrough();

export let managePrepaid = SlateTool.create(spec, {
  name: 'Manage Prepaid Balance',
  key: 'manage_prepaid',
  description: `Manage a contact's prepaid balance. Create transactions to top up or deduct from prepaid balance, list transaction history, or check current balance. Prepaid balances are linked directly to contacts.`,
  instructions: [
    'Use action "transact" with positive amountInCents to add funds, negative to deduct.',
    'Use action "balance" to check a contact\'s current prepaid balance.',
    'Use action "list" to view prepaid transaction history.'
  ]
})
  .input(
    z.object({
      action: z.enum(['transact', 'balance', 'list']).describe('Action to perform'),
      contactUuid: z.string().describe('UUID of the contact'),
      amountInCents: z
        .number()
        .optional()
        .describe('Transaction amount in cents (required for transact)'),
      shopUuid: z.string().optional().describe('Shop UUID (required for transact)'),
      limit: z.number().optional().describe('Items per page for list'),
      page: z.number().optional().describe('Page number for list')
    })
  )
  .output(
    z.object({
      balanceInCents: z.number().optional().describe('Current prepaid balance in cents'),
      balance: z.string().optional().describe('Formatted balance string'),
      transaction: prepaidTransactionSchema
        .optional()
        .describe('Transaction details (for transact action)'),
      transactions: z
        .array(prepaidTransactionSchema)
        .optional()
        .describe('List of transactions (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, contactUuid } = ctx.input;

    if (action === 'balance') {
      let result = await client.getContactPrepaidBalance(contactUuid);
      let data = result.data || result;
      return {
        output: {
          balanceInCents: data.balance_in_cents,
          balance: data.balance
        },
        message: `Prepaid balance for contact ${contactUuid}: **${data.balance || `${data.balance_in_cents} cents`}**.`
      };
    }

    if (action === 'list') {
      let result = await client.listPrepaidTransactions({
        contactUuid,
        shopUuid: ctx.input.shopUuid,
        limit: ctx.input.limit,
        page: ctx.input.page
      });
      let transactions = (result.data || []).map((t: any) => ({
        transactionUuid: t.uuid,
        amountInCents: t.amount_in_cents,
        balanceInCents: t.prepaid_balance?.balance_in_cents,
        contactUuid: t.contact?.uuid || contactUuid,
        shopUuid: t.shop?.uuid,
        createdAt: t.created_at,
        ...t
      }));
      return {
        output: { transactions },
        message: `Retrieved **${transactions.length}** prepaid transaction(s) for contact ${contactUuid}.`
      };
    }

    // transact
    if (ctx.input.amountInCents === undefined)
      throw new Error('amountInCents is required for transact');
    let shopUuid = ctx.input.shopUuid || ctx.config.shopUuid;
    if (!shopUuid) throw new Error('shopUuid is required for transact');

    let result = await client.createPrepaidTransaction({
      contactUuid,
      amountInCents: ctx.input.amountInCents,
      shopUuid
    });
    let t = result.data || result;
    return {
      output: {
        balanceInCents: t.prepaid_balance?.balance_in_cents,
        balance: t.prepaid_balance?.balance,
        transaction: {
          transactionUuid: t.uuid,
          amountInCents: t.amount_in_cents,
          balanceInCents: t.prepaid_balance?.balance_in_cents,
          contactUuid,
          shopUuid,
          createdAt: t.created_at,
          ...t
        }
      },
      message: `Prepaid transaction of **${ctx.input.amountInCents}** cents for contact ${contactUuid}. New balance: ${t.prepaid_balance?.balance || `${t.prepaid_balance?.balance_in_cents} cents`}.`
    };
  })
  .build();
