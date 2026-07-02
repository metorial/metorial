import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let interviewEventTypes = ['interview_deleted', 'scorecard_deleted'] as const;

export let interviewEventsTrigger = SlateTrigger.create(spec, {
  name: 'Interview Events',
  key: 'interview_events',
  description:
    'Triggers when interview-related events occur in Greenhouse, including interview deleted and scorecard deleted.'
})
  .input(
    z.object({
      eventType: z.string().describe('The Greenhouse webhook action type'),
      eventId: z
        .string()
        .describe('Unique webhook delivery ID from Greenhouse-Event-ID header'),
      rawPayload: z.any().describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      interviewId: z
        .string()
        .nullable()
        .describe('The scheduled interview ID (for interview deleted events)'),
      scorecardId: z
        .string()
        .nullable()
        .describe('The scorecard ID (for scorecard deleted events)'),
      applicationId: z.string().nullable().describe('The related application ID'),
      candidateId: z.string().nullable().describe('The related candidate ID'),
      interviewName: z.string().nullable().describe('Name of the interview')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let eventId = ctx.request.headers.get('Greenhouse-Event-ID') || crypto.randomUUID();
      let action = data?.action ?? 'unknown';

      if (!interviewEventTypes.includes(action)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: action,
            eventId,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.rawPayload?.payload ?? {};
      let action = ctx.input.eventType;

      let interview = payload.interview ?? payload.scheduled_interview ?? {};
      let scorecard = payload.scorecard ?? {};
      let application = payload.application ?? interview?.application ?? {};
      let candidate = application?.candidate ?? {};

      let isScorecard = action === 'scorecard_deleted';
      let type = isScorecard ? 'scorecard.deleted' : 'interview.deleted';

      return {
        type,
        id: ctx.input.eventId,
        output: {
          interviewId: !isScorecard ? (interview?.id?.toString() ?? null) : null,
          scorecardId: isScorecard ? (scorecard?.id?.toString() ?? null) : null,
          applicationId: application?.id?.toString() ?? null,
          candidateId: candidate?.id?.toString() ?? null,
          interviewName: interview?.name ?? null
        }
      };
    }
  })
  .build();
