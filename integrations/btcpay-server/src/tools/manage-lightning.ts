import { SlateTool } from 'slates';
import { z } from 'zod';
import { BTCPayClient } from '../lib/client';
import { storeIdSchema } from '../lib/schemas';
import { requireFields } from '../lib/values';
import { spec } from '../spec';

export let manageLightning = SlateTool.create(spec, {
  name: 'Manage Lightning',
  key: 'manage_lightning',
  description: `Manage Lightning Network operations for a store, including checking balance, creating invoices, paying invoices (BOLT11), and viewing channels. Requires a connected Lightning node.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'balance',
          'create_invoice',
          'pay_invoice',
          'get_invoice',
          'channels',
          'info',
          'get_payment',
          'list_invoices',
          'list_payments'
        ])
        .describe('Lightning action to perform'),
      storeId: storeIdSchema,
      cryptoCode: z.string().optional().default('BTC').describe('Cryptocurrency code'),
      paymentHash: z.string().optional().describe('Payment hash for get_payment'),
      pendingOnly: z.boolean().optional().describe('Only pending invoices for list_invoices'),
      includePending: z
        .boolean()
        .optional()
        .describe('Include pending payments for list_payments'),
      offsetIndex: z
        .number()
        .optional()
        .describe('Provider continuation index for list_invoices or list_payments'),
      // create invoice
      amount: z.string().optional().describe('Amount in millisatoshi (for create_invoice)'),
      description: z.string().optional().describe('Invoice description (for create_invoice)'),
      expiry: z.number().optional().describe('Expiry in seconds (for create_invoice)'),
      // pay invoice
      bolt11: z.string().optional().describe('BOLT11 invoice to pay (for pay_invoice)'),
      maxFeePercent: z
        .number()
        .optional()
        .describe('Max fee as percentage of amount (for pay_invoice)'),
      maxFeeFlat: z.string().optional().describe('Max fee in sats (for pay_invoice)'),
      // get invoice
      lightningInvoiceId: z
        .string()
        .optional()
        .describe('Lightning invoice ID (for get_invoice)')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Complete provider response'),
      details: z
        .unknown()
        .optional()
        .describe('Lightning node, invoice list, or payment list data'),
      balance: z
        .object({
          offchain: z
            .string()
            .optional()
            .describe('Off-chain (Lightning) local balance in millisatoshis')
        })
        .optional()
        .describe('Lightning balance'),
      invoice: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Lightning invoice details'),
      payment: z.record(z.string(), z.unknown()).optional().describe('Payment result'),
      channels: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Lightning channels')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BTCPayClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let { action, storeId, cryptoCode } = ctx.input;

    if (action === 'balance') {
      let bal = await client.getLightningBalance(storeId, cryptoCode);
      let offchain = bal.offchain as Record<string, unknown> | undefined;
      return {
        output: {
          raw: bal,
          balance: {
            offchain: typeof offchain?.local === 'string' ? offchain.local : undefined
          }
        },
        message: `Lightning balance: **${offchain?.local ?? 'unknown'}** millisatoshis available.`
      };
    }

    if (action === 'create_invoice') {
      requireFields(ctx.input, ['amount'], action);
      let inv = await client.createLightningInvoice(storeId, cryptoCode!, {
        amount: ctx.input.amount!,
        description: ctx.input.description,
        expiry: ctx.input.expiry
      });
      return {
        output: { invoice: inv },
        message: `Lightning invoice created: \`${((inv.BOLT11 as string) || '').substring(0, 40)}...\``
      };
    }

    if (action === 'pay_invoice') {
      requireFields(ctx.input, ['bolt11'], action);
      let result = await client.payLightningInvoice(storeId, cryptoCode!, ctx.input.bolt11!, {
        maxFeePercent: ctx.input.maxFeePercent,
        maxFeeFlat: ctx.input.maxFeeFlat
      });
      return {
        output: { payment: result },
        message: `Lightning payment request returned status **${result.status ?? 'unknown'}**.`
      };
    }

    if (action === 'get_invoice') {
      requireFields(ctx.input, ['lightningInvoiceId'], action);
      let inv = await client.getLightningInvoice(
        storeId,
        cryptoCode!,
        ctx.input.lightningInvoiceId!
      );
      return {
        output: { invoice: inv },
        message: `Lightning invoice **${inv.id}** — status: **${inv.status}**.`
      };
    }

    if (['info', 'get_payment', 'list_invoices', 'list_payments'].includes(action)) {
      if (action === 'get_payment') requireFields(ctx.input, ['paymentHash'], action);
      let data = await client.getLightningDetails(storeId, cryptoCode, action, {
        paymentHash: ctx.input.paymentHash,
        pendingOnly: ctx.input.pendingOnly,
        includePending: ctx.input.includePending,
        offsetIndex: ctx.input.offsetIndex
      });
      return { output: { details: data, raw: data }, message: 'Retrieved Lightning details.' };
    }
    // channels
    let channels = await client.getLightningChannels(storeId, cryptoCode);
    return {
      output: { channels },
      message: `Found **${channels.length}** Lightning channel(s).`
    };
  })
  .build();
