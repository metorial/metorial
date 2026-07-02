import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let applicationEventTypes = [
  'application_created',
  'application_updated',
  'application_deleted',
  'offer_created',
  'offer_approved',
  'offer_updated',
  'offer_deleted',
  'prospect_created'
] as const;

export let applicationEventsTrigger = SlateTrigger.create(spec, {
  name: 'Application Events',
  key: 'application_events',
  description:
    'Triggers when application-related events occur in Greenhouse, including application created/updated/deleted, offer created/approved/updated/deleted, and prospect created.'
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
      applicationId: z.string().nullable().describe('The application ID'),
      candidateId: z.string().nullable().describe('The candidate ID'),
      jobId: z.string().nullable().describe('The associated job ID'),
      jobName: z.string().nullable().describe('The associated job name'),
      candidateName: z.string().nullable().describe('The candidate name'),
      status: z.string().nullable().describe('Current application or offer status'),
      currentStage: z.string().nullable().describe('Current interview stage name'),
      offerId: z.string().nullable().describe('The offer ID (for offer events)'),
      offerStatus: z.string().nullable().describe('The offer status (for offer events)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let eventId = ctx.request.headers.get('Greenhouse-Event-ID') || crypto.randomUUID();
      let action = data?.action ?? 'unknown';

      if (!applicationEventTypes.includes(action)) {
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

      let application = payload.application ?? payload;
      let candidate = application?.candidate ?? payload?.candidate ?? {};
      let offer = payload.offer ?? payload;
      let jobs = application?.jobs ?? [];
      let firstJob = jobs[0] ?? {};

      let isOfferEvent = action.startsWith('offer_');

      let type = action.replace('_', '.');

      return {
        type,
        id: ctx.input.eventId,
        output: {
          applicationId: (application?.id ?? payload?.application_id)?.toString() ?? null,
          candidateId: (candidate?.id ?? application?.candidate_id)?.toString() ?? null,
          jobId: firstJob?.id?.toString() ?? null,
          jobName: firstJob?.name ?? null,
          candidateName:
            candidate?.first_name && candidate?.last_name
              ? `${candidate.first_name} ${candidate.last_name}`
              : null,
          status: application?.status ?? null,
          currentStage: application?.current_stage?.name ?? null,
          offerId: isOfferEvent ? (offer?.id?.toString() ?? null) : null,
          offerStatus: isOfferEvent ? (offer?.status ?? null) : null
        }
      };
    }
  })
  .build();
