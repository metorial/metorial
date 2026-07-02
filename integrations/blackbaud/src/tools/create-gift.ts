import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let giftSplitSchema = z.object({
  fundId: z.string().describe('System record ID of the fund for this split.'),
  amount: z.number().describe('Amount for this split.'),
  campaignId: z.string().optional().describe('System record ID of the campaign.'),
  appealId: z.string().optional().describe('System record ID of the appeal.'),
  packageId: z.string().optional().describe('System record ID of the package.')
});

export let createGift = SlateTool.create(spec, {
  name: 'Create Gift',
  key: 'create_gift',
  description: `Create a new gift (donation) for a constituent. Supports various gift types and payment methods. Gift splits allow allocating portions to different campaigns, funds, and appeals.`,
  instructions: [
    'At least one gift split with a fund ID is required.',
    'The total of gift split amounts should equal the gift amount.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      constituentId: z.string().describe('System record ID of the constituent.'),
      amount: z.number().describe('Gift amount.'),
      date: z.string().describe('Gift date (YYYY-MM-DD).'),
      giftType: z
        .string()
        .default('Donation')
        .describe(
          'Gift type (e.g., "Donation", "Pledge", "RecurringGift", "GiftInKind", "Other").'
        ),
      paymentMethod: z
        .string()
        .default('Cash')
        .describe(
          'Payment method (e.g., "Cash", "PersonalCheck", "CreditCard", "DirectDebit", "Other").'
        ),
      splits: z
        .array(giftSplitSchema)
        .min(1)
        .describe('Gift splits allocating the gift to campaigns, funds, and appeals.'),
      isAnonymous: z.boolean().optional().describe('Whether the gift is anonymous.'),
      subtype: z.string().optional().describe('Gift subtype.'),
      reference: z.string().optional().describe('Notes or special details about the gift.'),
      lookupId: z.string().optional().describe('User-defined identifier for the gift.'),
      checkNumber: z
        .string()
        .optional()
        .describe('Check number (for PersonalCheck payments).'),
      receiptStatus: z
        .string()
        .optional()
        .default('DoNotReceipt')
        .describe('Receipt status (Receipted, NeedsReceipt, DoNotReceipt).'),
      receiptAmount: z.number().optional().describe('Receipt amount.')
    })
  )
  .output(
    z.object({
      giftId: z.string().describe('System record ID of the newly created gift.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subscriptionKey: ctx.auth.subscriptionKey
    });

    let giftData: Record<string, any> = {
      constituent_id: ctx.input.constituentId,
      type: ctx.input.giftType,
      date: ctx.input.date,
      amount: { value: ctx.input.amount },
      gift_splits: ctx.input.splits.map(s => ({
        fund_id: s.fundId,
        amount: { value: s.amount },
        campaign_id: s.campaignId,
        appeal_id: s.appealId,
        package_id: s.packageId
      })),
      payments: [
        {
          payment_method: ctx.input.paymentMethod,
          check_number: ctx.input.checkNumber
        }
      ],
      receipts: [
        {
          status: ctx.input.receiptStatus || 'DoNotReceipt',
          amount: { value: ctx.input.receiptAmount ?? ctx.input.amount }
        }
      ]
    };

    if (ctx.input.isAnonymous !== undefined) {
      giftData.is_anonymous = ctx.input.isAnonymous;
    }
    if (ctx.input.subtype) giftData.subtype = ctx.input.subtype;
    if (ctx.input.reference) giftData.reference = ctx.input.reference;
    if (ctx.input.lookupId) giftData.lookup_id = ctx.input.lookupId;

    let result = await client.createGift(giftData);
    let giftId = String(result?.id || result);

    return {
      output: { giftId },
      message: `Created **${ctx.input.giftType}** gift of **$${ctx.input.amount}** for constituent ${ctx.input.constituentId}. Gift ID: ${giftId}.`
    };
  })
  .build();
