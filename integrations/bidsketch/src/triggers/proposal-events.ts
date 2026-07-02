import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { BidsketchClient } from '../lib/client';
import { spec } from '../spec';

let proposalEventTypes = [
  'proposal_created',
  'proposal_sent',
  'proposal_viewed',
  'proposal_accepted',
  'proposal_declined',
  'proposal_accepted_or_declined'
] as const;

export let proposalEvents = SlateTrigger.create(spec, {
  name: 'Proposal Events',
  key: 'proposal_events',
  description:
    'Triggers on proposal lifecycle events: created, sent, viewed, accepted, or declined. Registers separate webhooks for each selected event type.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type (e.g. proposal_created, proposal_sent)'),
      proposalId: z.number().describe('Proposal ID'),
      name: z.string().describe('Proposal name'),
      description: z.string().nullable().describe('Proposal description'),
      status: z.string().nullable().describe('Proposal status'),
      isDraft: z.boolean().nullable().describe('Whether proposal is a draft'),
      currency: z.string().nullable().describe('Currency code'),
      total: z.number().nullable().describe('Total amount'),
      monthlyFees: z.number().nullable().describe('Monthly fees total'),
      yearlyFees: z.number().nullable().describe('Yearly fees total'),
      oneTimeFees: z.number().nullable().describe('One-time fees total'),
      user: z.string().nullable().describe('Proposal owner'),
      clientId: z.number().nullable().describe('Associated client ID'),
      clientName: z.string().nullable().describe('Associated client name'),
      url: z.string().nullable().describe('API URL'),
      appUrl: z.string().nullable().describe('Bidsketch app URL'),
      createdAt: z.string().nullable().describe('Creation timestamp'),
      updatedAt: z.string().nullable().describe('Last update timestamp')
    })
  )
  .output(
    z.object({
      proposalId: z.number().describe('Unique proposal ID'),
      name: z.string().describe('Proposal name'),
      description: z.string().nullable().describe('Proposal description'),
      status: z
        .string()
        .nullable()
        .describe('Proposal status: Pending, Viewed, Accepted, or Declined'),
      isDraft: z.boolean().nullable().describe('Whether the proposal is a draft'),
      currency: z.string().nullable().describe('ISO 4217 currency code'),
      total: z.number().nullable().describe('Total amount'),
      monthlyFees: z.number().nullable().describe('Monthly fees total'),
      yearlyFees: z.number().nullable().describe('Yearly fees total'),
      oneTimeFees: z.number().nullable().describe('One-time fees total'),
      user: z.string().nullable().describe('Proposal owner name'),
      clientId: z.number().nullable().describe('Associated client ID'),
      clientName: z.string().nullable().describe('Associated client name'),
      url: z.string().nullable().describe('API URL'),
      appUrl: z.string().nullable().describe('Bidsketch app URL'),
      createdAt: z.string().nullable().describe('Creation timestamp'),
      updatedAt: z.string().nullable().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new BidsketchClient(ctx.auth.token);

      let webhookIds: Record<string, number> = {};

      for (let eventType of proposalEventTypes) {
        let webhook = await client.createWebhook(eventType, ctx.input.webhookBaseUrl);
        webhookIds[eventType] = webhook.id;
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new BidsketchClient(ctx.auth.token);
      let details = ctx.input.registrationDetails as { webhookIds: Record<string, number> };

      for (let webhookId of Object.values(details.webhookIds)) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as { event: string; data: any };

      let d = body.data;

      return {
        inputs: [
          {
            eventType: body.event,
            proposalId: d.id,
            name: d.name,
            description: d.description ?? null,
            status: d.status ?? null,
            isDraft: d.is_draft ?? null,
            currency: d.currency ?? null,
            total: d.total ?? null,
            monthlyFees: d.monthly_fees ?? null,
            yearlyFees: d.yearly_fees ?? null,
            oneTimeFees: d.one_time_fees ?? null,
            user: d.user ?? null,
            clientId: d.client?.id ?? null,
            clientName: d.client?.name ?? null,
            url: d.url ?? null,
            appUrl: d.app_url ?? null,
            createdAt: d.created_at ?? null,
            updatedAt: d.updated_at ?? null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let typeMap: Record<string, string> = {
        proposal_created: 'proposal.created',
        proposal_sent: 'proposal.sent',
        proposal_viewed: 'proposal.viewed',
        proposal_accepted: 'proposal.accepted',
        proposal_declined: 'proposal.declined',
        proposal_accepted_or_declined: 'proposal.accepted_or_declined'
      };

      let eventType = typeMap[ctx.input.eventType] ?? `proposal.${ctx.input.eventType}`;

      return {
        type: eventType,
        id: `${ctx.input.eventType}_${ctx.input.proposalId}_${ctx.input.updatedAt ?? ctx.input.createdAt ?? Date.now()}`,
        output: {
          proposalId: ctx.input.proposalId,
          name: ctx.input.name,
          description: ctx.input.description,
          status: ctx.input.status,
          isDraft: ctx.input.isDraft,
          currency: ctx.input.currency,
          total: ctx.input.total,
          monthlyFees: ctx.input.monthlyFees,
          yearlyFees: ctx.input.yearlyFees,
          oneTimeFees: ctx.input.oneTimeFees,
          user: ctx.input.user,
          clientId: ctx.input.clientId,
          clientName: ctx.input.clientName,
          url: ctx.input.url,
          appUrl: ctx.input.appUrl,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
