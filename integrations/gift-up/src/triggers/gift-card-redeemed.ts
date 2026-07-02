import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let giftCardRedeemedSchema = z
  .object({
    code: z.string().describe('Gift card code'),
    title: z.string().nullable().describe('Gift card title'),
    canBeRedeemed: z.boolean().describe('Whether still redeemable'),
    hasExpired: z.boolean().describe('Whether expired'),
    isVoided: z.boolean().describe('Whether voided'),
    backingType: z.string().describe('Currency or Units'),
    remainingValue: z.number().describe('Remaining balance after redemption'),
    initialValue: z.number().describe('Initial value'),
    remainingUnits: z.number().nullable().describe('Remaining units after redemption'),
    initialUnits: z.number().nullable().describe('Initial units'),
    recipientName: z.string().nullable().describe('Recipient name'),
    recipientEmail: z.string().nullable().describe('Recipient email'),
    sku: z.string().nullable().describe('SKU'),
    redeemedAmount: z.number().nullable().describe('Amount redeemed in this event'),
    redeemedUnits: z.number().nullable().describe('Units redeemed in this event'),
    redeemedByEmail: z.string().nullable().describe('Email of person who redeemed'),
    redeemedByName: z.string().nullable().describe('Name of person who redeemed'),
    redeemedOn: z.string().nullable().describe('When the redemption occurred')
  })
  .passthrough();

export let giftCardRedeemedTrigger = SlateTrigger.create(spec, {
  name: 'Gift Card Redeemed',
  key: 'gift_card_redeemed',
  description: 'Fires when a gift card is redeemed, either partially or in full.'
})
  .input(giftCardRedeemedSchema)
  .output(giftCardRedeemedSchema)
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        testMode: ctx.config.testMode
      });

      let webhook = await client.createWebhook({
        targetUrl: ctx.input.webhookBaseUrl,
        eventType: 'GiftCardRedeemed',
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
            isVoided: body.isVoided ?? false,
            backingType: body.backingType ?? 'Currency',
            remainingValue: body.remainingValue ?? 0,
            initialValue: body.initialValue ?? 0,
            remainingUnits: body.remainingUnits ?? null,
            initialUnits: body.initialUnits ?? null,
            recipientName: body.recipientName ?? null,
            recipientEmail: body.recipientEmail ?? null,
            sku: body.sku ?? null,
            redeemedAmount: body.redeemedAmount ?? null,
            redeemedUnits: body.redeemedUnits ?? null,
            redeemedByEmail: body.redeemedByEmail ?? null,
            redeemedByName: body.redeemedByName ?? null,
            redeemedOn: body.redeemedOn ?? null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      // Use code + redeemedOn as a unique event ID
      let eventId = `${ctx.input.code}-${ctx.input.redeemedOn ?? Date.now()}`;

      return {
        type: 'gift_card.redeemed',
        id: eventId,
        output: ctx.input
      };
    }
  })
  .build();
