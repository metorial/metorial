import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let transactionEventTypes = [
  'transaction.auth',
  'transaction.auth.qualified',
  'transaction.clearing',
  'transaction.clearing.qualified',
  'transaction.refund',
  'transaction.refund.qualified',
  'transaction.refund.match.qualified'
] as const;

export let transactionEvents = SlateTrigger.create(spec, {
  name: 'Transaction Events',
  key: 'transaction_events',
  description:
    'Triggers when transaction events occur, including authorizations, clearings, refunds, and offer-qualified transactions on linked cards.'
})
  .input(
    z.object({
      eventType: z.enum(transactionEventTypes).describe('Type of transaction event'),
      transactionId: z.string().describe('Unique identifier of the transaction'),
      rawEvent: z.any().describe('Raw event payload from Fidel API')
    })
  )
  .output(
    z.object({
      transactionId: z.string().describe('Unique identifier of the transaction'),
      programId: z.string().optional().describe('ID of the program'),
      cardId: z.string().optional().describe('Token ID of the card used'),
      locationId: z.string().optional().describe('ID of the location'),
      brandId: z.string().optional().describe('ID of the brand'),
      accountId: z.string().optional().describe('Account ID'),
      amount: z.number().optional().describe('Transaction amount'),
      currency: z.string().optional().describe('ISO 4217 currency code'),
      scheme: z.string().optional().describe('Card network (visa, mastercard, amex)'),
      lastNumbers: z.string().optional().describe('Last four digits of the card'),
      firstNumbers: z.string().optional().describe('First six digits of the card'),
      auth: z.boolean().optional().describe('Whether this is an authorization event'),
      cleared: z.boolean().optional().describe('Whether the transaction has been cleared'),
      live: z.boolean().optional().describe('Whether this is a live transaction'),
      merchantId: z.string().optional().describe('Merchant identifier'),
      merchantName: z.string().optional().describe('Merchant name'),
      wallet: z.string().optional().nullable().describe('Digital wallet type'),
      datetime: z.string().optional().describe('ISO 8601 date of the transaction'),
      created: z.string().optional().describe('ISO 8601 creation timestamp'),
      updated: z.string().optional().describe('ISO 8601 update timestamp'),
      offerQualified: z
        .boolean()
        .optional()
        .describe('Whether the transaction qualified for an offer'),
      offerId: z.string().optional().nullable().describe('ID of the qualified offer, if any'),
      qualifiedAmount: z
        .number()
        .optional()
        .nullable()
        .describe('Qualified reward amount, if applicable')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let registrations: Array<{ webhookId: string; programId: string; event: string }> = [];

      // We need a programId to register webhooks. The user may have multiple programs.
      // Register for all transaction events on all programs.
      let programsData = await client.listPrograms({ limit: 100 });
      let programs = programsData?.items ?? [];

      for (let program of programs) {
        for (let event of transactionEventTypes) {
          try {
            let webhook = await client.createWebhook(program.id, {
              event,
              url: ctx.input.webhookBaseUrl
            });
            registrations.push({
              webhookId: webhook.id,
              programId: program.id,
              event
            });
          } catch {
            // Webhook may already exist or limit reached; continue
          }
        }
      }

      return {
        registrationDetails: { registrations }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let registrations = (ctx.input.registrationDetails as any)?.registrations ?? [];

      for (let reg of registrations) {
        try {
          await client.deleteWebhook(reg.webhookId, reg.programId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.input.request.json()) as any;

      // Fidel API sends webhook payloads directly as the transaction object
      // The event type is identified by the registered webhook event
      let eventType = data?.type ?? 'transaction.auth';
      let transactionId = data?.id ?? '';

      return {
        inputs: [
          {
            eventType: eventType as (typeof transactionEventTypes)[number],
            transactionId,
            rawEvent: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let tx = ctx.input.rawEvent;
      let isQualified = ctx.input.eventType.includes('qualified');

      return {
        type: ctx.input.eventType,
        id: ctx.input.transactionId || `${ctx.input.eventType}-${Date.now()}`,
        output: {
          transactionId: tx.id ?? ctx.input.transactionId,
          programId: tx.programId,
          cardId: tx.cardId ?? tx.card?.id,
          locationId: tx.locationId ?? tx.location?.id,
          brandId: tx.brandId ?? tx.brand?.id,
          accountId: tx.accountId,
          amount: tx.amount,
          currency: tx.currency,
          scheme: tx.scheme,
          lastNumbers: tx.lastNumbers ?? tx.card?.lastNumbers,
          firstNumbers: tx.firstNumbers ?? tx.card?.firstNumbers,
          auth: tx.auth,
          cleared: tx.cleared,
          live: tx.live,
          merchantId: tx.identifiers?.MID ?? tx.merchantId,
          merchantName: tx.merchantName ?? tx.location?.address,
          wallet: tx.wallet,
          datetime: tx.datetime,
          created: tx.created,
          updated: tx.updated,
          offerQualified: isQualified,
          offerId: tx.offer?.id ?? null,
          qualifiedAmount: tx.offer?.qualifiedAmount ?? tx.offer?.cashback ?? null
        }
      };
    }
  })
  .build();
