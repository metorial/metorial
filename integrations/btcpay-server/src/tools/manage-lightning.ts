import { SlateTool } from 'slates';
import { z } from 'zod';
import { BTCPayClient } from '../lib/client';
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
        .enum(['balance', 'create_invoice', 'pay_invoice', 'get_invoice', 'channels'])
        .describe('Lightning action to perform'),
      storeId: z.string().describe('Store ID'),
      cryptoCode: z.string().optional().default('BTC').describe('Cryptocurrency code'),
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
      balance: z
        .object({
          offchain: z.string().optional().describe('Off-chain (Lightning) balance in sats')
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
          balance: {
            offchain: offchain?.local as string | undefined
          }
        },
        message: `Lightning balance: **${offchain?.local ?? 'unknown'}** sats available.`
      };
    }

    if (action === 'create_invoice') {
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
      let result = await client.payLightningInvoice(storeId, cryptoCode!, ctx.input.bolt11!, {
        maxFeePercent: ctx.input.maxFeePercent,
        maxFeeFlat: ctx.input.maxFeeFlat
      });
      return {
        output: { payment: result },
        message: `Lightning payment sent successfully.`
      };
    }

    if (action === 'get_invoice') {
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

    // channels
    let channels = await client.getLightningChannels(storeId, cryptoCode);
    return {
      output: { channels },
      message: `Found **${channels.length}** Lightning channel(s).`
    };
  })
  .build();
