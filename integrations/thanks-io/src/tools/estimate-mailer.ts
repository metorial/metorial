import { SlateTool } from 'slates';
import { z } from 'zod';
import { ThanksIoClient } from '../lib/client';
import { mapRadiusSearch, radiusSearchSchema, recipientFields } from '../lib/schemas';
import { spec } from '../spec';

export let estimateMailer = SlateTool.create(spec, {
  name: 'Estimate Mailer Cost',
  key: 'estimate_mailer',
  description:
    'Price a postcard, letter, notecard, gift card, or magnacard before sending. Returns the cost breakdown, current balance and whether the balance covers the order. No order is created and nothing is charged or mailed.',
  instructions: [
    'Use the same recipients and design settings as the intended send.',
    'Use list_creatives to find a saved creativeId. When using it, omit all design, message, handwriting, background and gift card fields.',
    'For postcards select mailerType postcard and the required size.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      mailerType: z.enum([
        'postcard',
        'windowedletter',
        'windowlessletter',
        'notecard',
        'giftcard',
        'magnacard'
      ]),
      size: z.enum(['4x6', '6x9', '6x11']).optional(),
      creativeId: z.number().int().positive().optional(),
      frontImageUrl: z.string().optional(),
      imageTemplateId: z.number().int().positive().optional(),
      message: z.string().optional(),
      messageTemplateId: z.number().int().positive().optional(),
      handwritingStyleId: z.number().int().positive().optional(),
      handwritingColor: z.string().optional(),
      handwritingRealism: z.boolean().optional(),
      useCustomBackground: z.boolean().optional(),
      customBackgroundImage: z.string().optional(),
      qrcodeUrl: z.string().optional(),
      recipients: z.array(z.object(recipientFields)).optional(),
      mailingListIds: z.array(z.number().int().positive()).optional(),
      radiusSearch: radiusSearchSchema.optional(),
      subAccountId: z.number().int().positive().optional(),
      sendStandardMail: z.boolean().optional(),
      returnName: z.string().optional(),
      returnAddress: z.string().optional(),
      returnAddress2: z.string().optional(),
      returnCity: z.string().optional(),
      returnState: z.string().optional(),
      returnPostalCode: z.string().optional(),
      additionalPagesUrl: z.string().optional(),
      pdfOnlyUrl: z.string().optional(),
      giftcardBrand: z.string().optional(),
      giftcardAmountInCents: z.number().int().positive().optional(),
      notificationEmails: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional()
    })
  )
  .output(
    z.object({
      estimate: z
        .record(z.string(), z.unknown())
        .describe(
          'Provider estimate with costs in cents, recipient counts, balance coverage and notes'
        ),
      raw: z.record(z.string(), z.unknown()).describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ThanksIoClient({ token: ctx.auth.token });
    let result = await client.estimateMailer(ctx.input.mailerType, {
      ...ctx.input,
      imageTemplate: ctx.input.imageTemplateId,
      messageTemplate: ctx.input.messageTemplateId,
      handwritingStyle: ctx.input.handwritingStyleId,
      mailingLists: ctx.input.mailingListIds,
      subAccount: ctx.input.subAccountId,
      emailAdditional: ctx.input.notificationEmails,
      radiusSearch: mapRadiusSearch(ctx.input.radiusSearch),
      recipients: ctx.input.recipients?.map(({ postalCode, ...recipient }) => ({
        ...recipient,
        postal_code: postalCode
      }))
    });
    return {
      output: { estimate: (result.data || result) as Record<string, unknown>, raw: result },
      message: 'Calculated the estimated order cost without placing an order.'
    };
  })
  .build();
