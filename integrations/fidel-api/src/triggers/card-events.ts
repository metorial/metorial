import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let cardEventTypes = ['card.linked', 'card.failed'] as const;

export let cardEvents = SlateTrigger.create(spec, {
  name: 'Card Events',
  key: 'card_events',
  description:
    'Triggers when a card is successfully linked to a program or when a card linking attempt fails.'
})
  .input(
    z.object({
      eventType: z.enum(cardEventTypes).describe('Type of card event'),
      cardId: z.string().describe('Unique identifier of the card'),
      rawEvent: z.any().describe('Raw event payload from Fidel API')
    })
  )
  .output(
    z.object({
      cardId: z.string().describe('Unique identifier (token) of the card'),
      programId: z.string().optional().describe('ID of the program'),
      accountId: z.string().optional().describe('Account ID'),
      scheme: z.string().optional().describe('Card network (visa, mastercard, amex)'),
      lastNumbers: z.string().optional().describe('Last four digits of the card'),
      firstNumbers: z.string().optional().describe('First six digits of the card'),
      expMonth: z.number().optional().describe('Expiration month'),
      expYear: z.number().optional().describe('Expiration year'),
      countryCode: z.string().optional().describe('Country code'),
      live: z.boolean().optional().describe('Whether the card is in live mode'),
      created: z.string().optional().describe('ISO 8601 creation timestamp'),
      updated: z.string().optional().describe('ISO 8601 update timestamp'),
      metadata: z.record(z.string(), z.any()).optional().describe('Custom metadata')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let registrations: Array<{ webhookId: string; programId: string; event: string }> = [];

      let programsData = await client.listPrograms({ limit: 100 });
      let programs = programsData?.items ?? [];

      for (let program of programs) {
        for (let event of cardEventTypes) {
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
            // Continue on error
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
          // Continue on error
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.input.request.json()) as any;
      let eventType = data?.type ?? 'card.linked';
      let cardId = data?.id ?? '';

      return {
        inputs: [
          {
            eventType: eventType as (typeof cardEventTypes)[number],
            cardId,
            rawEvent: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let card = ctx.input.rawEvent;

      return {
        type: ctx.input.eventType,
        id: ctx.input.cardId || `${ctx.input.eventType}-${Date.now()}`,
        output: {
          cardId: card.id ?? ctx.input.cardId,
          programId: card.programId,
          accountId: card.accountId,
          scheme: card.scheme,
          lastNumbers: card.lastNumbers,
          firstNumbers: card.firstNumbers,
          expMonth: card.expMonth,
          expYear: card.expYear,
          countryCode: card.countryCode,
          live: card.live,
          created: card.created,
          updated: card.updated,
          metadata: card.metadata
        }
      };
    }
  })
  .build();
