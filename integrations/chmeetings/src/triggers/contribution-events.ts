import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let contributionEvents = SlateTrigger.create(spec, {
  name: 'Contribution Events',
  key: 'contribution_events',
  description: `Triggered when a new contribution is recorded in ChMeetings. Configure the webhook endpoint in ChMeetings under Settings > Integrations > Webhooks.`
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      contribution: z
        .record(z.string(), z.unknown())
        .describe('Contribution data from the webhook payload')
    })
  )
  .output(
    z.object({
      contributionId: z.number().describe('ID of the new contribution'),
      personId: z.number().optional().describe('ID of the person who made the contribution'),
      date: z.string().optional().describe('Contribution date'),
      paymentMethod: z.string().optional().describe('Payment method used'),
      funds: z
        .array(
          z.object({
            fundName: z.string().describe('Fund name'),
            amount: z.number().describe('Amount contributed')
          })
        )
        .optional()
        .describe('Fund allocations'),
      contribution: z
        .record(z.string(), z.unknown())
        .describe('Full contribution data from the event')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, unknown>;

      let contributionData = (body.data ??
        body.contribution ??
        body.payload ??
        body) as Record<string, unknown>;
      let contributionId =
        contributionData.id ?? body.contribution_id ?? body.contributionId ?? '';
      let eventId = String(
        body.id ??
          body.event_id ??
          body.eventId ??
          `contribution-created-${contributionId}-${Date.now()}`
      );

      return {
        inputs: [
          {
            eventId,
            contribution: contributionData
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let contribution = ctx.input.contribution;
      let contributionId = Number(contribution.id ?? contribution.contribution_id ?? 0);
      let personId = contribution.person_id as number | undefined;
      let date = contribution.date as string | undefined;
      let paymentMethod = contribution.payment_method as string | undefined;

      let rawFunds = contribution.funds as
        | { fund_name?: string; amount?: number }[]
        | undefined;
      let funds = rawFunds?.map(f => ({
        fundName: f.fund_name ?? '',
        amount: f.amount ?? 0
      }));

      return {
        type: 'contribution.created',
        id: ctx.input.eventId,
        output: {
          contributionId,
          personId: personId !== undefined ? Number(personId) : undefined,
          date,
          paymentMethod,
          funds,
          contribution
        }
      };
    }
  })
  .build();
