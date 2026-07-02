import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let giftCardUpdatedSchema = z
  .object({
    code: z.string().describe('Gift card code'),
    title: z.string().nullable().describe('Gift card title'),
    canBeRedeemed: z.boolean().describe('Whether redeemable'),
    hasExpired: z.boolean().describe('Whether expired'),
    notYetValid: z.boolean().describe('Whether not yet valid'),
    isVoided: z.boolean().describe('Whether voided'),
    backingType: z.string().describe('Currency or Units'),
    remainingValue: z.number().describe('Remaining currency balance'),
    initialValue: z.number().describe('Initial currency value'),
    remainingUnits: z.number().nullable().describe('Remaining units'),
    initialUnits: z.number().nullable().describe('Initial units'),
    recipientName: z.string().nullable().describe('Recipient name'),
    recipientEmail: z.string().nullable().describe('Recipient email'),
    sku: z.string().nullable().describe('SKU'),
    expiresOn: z.string().nullable().describe('Expiry date'),
    validFrom: z.string().nullable().describe('Valid-from date'),
    voidedOn: z.string().nullable().describe('Voided date')
  })
  .passthrough();

export let giftCardUpdatedTrigger = SlateTrigger.create(spec, {
  name: 'Gift Card Updated',
  key: 'gift_card_updated',
  description:
    'Fires when a gift card is updated (e.g., properties changed, topped up, voided, or reactivated).'
})
  .input(giftCardUpdatedSchema)
  .output(giftCardUpdatedSchema)
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        testMode: ctx.config.testMode
      });

      let webhook = await client.createWebhook({
        targetUrl: ctx.input.webhookBaseUrl,
        eventType: 'GiftCardUpdated',
        testMode: ctx.config.testMode
      });

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        testMode: ctx.config.testMode
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      if (body.test === true) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            code: body.code,
            title: body.title ?? null,
            canBeRedeemed: body.canBeRedeemed ?? false,
            hasExpired: body.hasExpired ?? false,
            notYetValid: body.notYetValid ?? false,
            isVoided: body.isVoided ?? false,
            backingType: body.backingType ?? 'Currency',
            remainingValue: body.remainingValue ?? 0,
            initialValue: body.initialValue ?? 0,
            remainingUnits: body.remainingUnits ?? null,
            initialUnits: body.initialUnits ?? null,
            recipientName: body.recipientName ?? null,
            recipientEmail: body.recipientEmail ?? null,
            sku: body.sku ?? null,
            expiresOn: body.expiresOn ?? null,
            validFrom: body.validFrom ?? null,
            voidedOn: body.voidedOn ?? null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      // Use code + timestamp for deduplication
      let eventId = `${ctx.input.code}-updated-${Date.now()}`;

      return {
        type: 'gift_card.updated',
        id: eventId,
        output: ctx.input
      };
    }
  })
  .build();
