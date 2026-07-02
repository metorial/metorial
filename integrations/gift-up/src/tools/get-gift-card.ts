import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let giftCardSchema = z
  .object({
    code: z.string().describe('Unique gift card code'),
    title: z.string().nullable().describe('Gift card title'),
    subTitle: z.string().nullable().describe('Gift card subtitle'),
    message: z.string().nullable().describe('Personal message on the gift card'),
    canBeRedeemed: z.boolean().describe('Whether the gift card can currently be redeemed'),
    hasExpired: z.boolean().describe('Whether the gift card has expired'),
    notYetValid: z.boolean().describe('Whether the gift card is not yet valid'),
    isVoided: z.boolean().describe('Whether the gift card has been voided'),
    backingType: z.string().describe('Backing type: Currency or Units'),
    remainingValue: z.number().describe('Remaining currency balance'),
    initialValue: z.number().describe('Initial currency value'),
    remainingUnits: z.number().nullable().describe('Remaining units (for unit-backed cards)'),
    initialUnits: z.number().nullable().describe('Initial units (for unit-backed cards)'),
    equivalentValuePerUnit: z.number().nullable().describe('Currency value per unit'),
    recipientName: z.string().nullable().describe('Recipient name'),
    recipientEmail: z.string().nullable().describe('Recipient email'),
    terms: z.string().nullable().describe('Terms and conditions'),
    sku: z.string().nullable().describe('SKU identifier'),
    expiresOn: z.string().nullable().describe('Expiry date (ISO 8601)'),
    validFrom: z.string().nullable().describe('Valid-from date (ISO 8601)'),
    voidedOn: z.string().nullable().describe('Voided date (ISO 8601)'),
    fulfilledOn: z.string().nullable().describe('Fulfilment date (ISO 8601)'),
    fulfilledBy: z.string().nullable().describe('Fulfilment method: Post or Email'),
    orderId: z.string().nullable().describe('Associated order ID'),
    orderNumber: z.string().nullable().describe('Associated order number')
  })
  .passthrough();

export let getGiftCard = SlateTool.create(spec, {
  name: 'Get Gift Card',
  key: 'get_gift_card',
  description: `Retrieve a gift card by its code. Returns the full gift card details including balance, status, recipient info, and redemption eligibility.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      code: z.string().describe('The gift card code to look up')
    })
  )
  .output(giftCardSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      testMode: ctx.config.testMode
    });

    let giftCard = await client.getGiftCard(ctx.input.code);

    let output = {
      ...giftCard,
      orderId: giftCard.order?.id ?? null,
      orderNumber: giftCard.order?.orderNumber ?? null
    };

    let statusParts: string[] = [];
    if (giftCard.canBeRedeemed) statusParts.push('redeemable');
    if (giftCard.hasExpired) statusParts.push('expired');
    if (giftCard.isVoided) statusParts.push('voided');
    if (giftCard.notYetValid) statusParts.push('not yet valid');
    let status = statusParts.length > 0 ? statusParts.join(', ') : 'active';

    return {
      output,
      message: `Gift card **${giftCard.code}** (${status}): remaining balance ${giftCard.remainingValue} ${giftCard.backingType === 'Units' ? 'units' : ''}`
    };
  })
  .build();
