import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { RecruiteeClient } from '../lib/client';
import { spec } from '../spec';

let candidateSchema = z.object({
  candidateId: z.number().describe('Candidate ID'),
  name: z.string().describe('Candidate full name'),
  emails: z.array(z.string()).describe('Email addresses'),
  phones: z.array(z.string()).describe('Phone numbers'),
  photoUrl: z.string().nullable().describe('Profile photo thumbnail URL'),
  source: z.string().nullable().describe('Candidate source'),
  createdAt: z.string().describe('Candidate creation timestamp')
});

let offerSchema = z
  .object({
    offerId: z.number().describe('Offer/job ID'),
    title: z.string().describe('Offer title'),
    kind: z.string().describe('Offer type: job or talent_pool'),
    slug: z.string().nullable().describe('Offer URL slug')
  })
  .nullable();

let stageSchema = z
  .object({
    stageId: z.number().describe('Stage ID'),
    name: z.string().describe('Stage name'),
    category: z
      .string()
      .describe('Stage category (e.g., apply, phone_screen, interview, offer, hire)')
  })
  .nullable();

export let candidateEvents = SlateTrigger.create(spec, {
  name: 'Candidate Events',
  key: 'candidate_events',
  description:
    'Fires when a candidate is created, assigned to a job, moved through the pipeline, disqualified, requalified, or deleted.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type identifier'),
      eventSubtype: z
        .string()
        .nullable()
        .describe('Event subtype for more specific categorization'),
      webhookEventId: z.number().describe('Unique webhook event ID'),
      candidate: z.any().describe('Raw candidate data from webhook'),
      offer: z.any().nullable().describe('Raw offer data from webhook'),
      details: z.any().nullable().describe('Raw event details from webhook'),
      companyId: z.number().nullable().describe('Company ID')
    })
  )
  .output(
    z.object({
      candidate: candidateSchema.describe('Candidate who triggered the event'),
      offer: offerSchema.describe('Associated job offer or talent pool (if applicable)'),
      fromStage: stageSchema.describe('Previous pipeline stage (for stage_changed events)'),
      toStage: stageSchema.describe(
        'New pipeline stage (for stage_changed, disqualified, requalified events)'
      ),
      disqualifyReason: z
        .string()
        .nullable()
        .describe('Disqualification reason (for disqualified events)'),
      eventSubtype: z
        .string()
        .nullable()
        .describe('Event subtype (e.g., stage_changed, disqualified, requalified)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new RecruiteeClient({
        token: ctx.auth.token,
        companyId: ctx.config.companyId
      });

      let result = await client.createWebhook(ctx.input.webhookBaseUrl, [
        'new_candidate',
        'candidate_assigned',
        'candidate_moved',
        'candidate_deleted'
      ]);

      return {
        registrationDetails: {
          webhookId: result.webhook?.id || result.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new RecruiteeClient({
        token: ctx.auth.token,
        companyId: ctx.config.companyId
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.event_type,
            eventSubtype: data.event_subtype || null,
            webhookEventId: data.id,
            candidate: data.payload?.candidate || null,
            offer: data.payload?.offer || null,
            details: data.payload?.details || null,
            companyId: data.payload?.company?.id || null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;
      let candidateData = input.candidate || {};
      let offerData = input.offer;
      let detailsData = input.details;

      let type = 'candidate.unknown';
      if (input.eventType === 'new_candidate') {
        type = 'candidate.created';
      } else if (input.eventType === 'candidate_assigned') {
        type = 'candidate.assigned';
      } else if (input.eventType === 'candidate_moved') {
        if (input.eventSubtype === 'stage_changed') {
          type = 'candidate.stage_changed';
        } else if (input.eventSubtype === 'disqualified') {
          type = 'candidate.disqualified';
        } else if (input.eventSubtype === 'requalified') {
          type = 'candidate.requalified';
        } else {
          type = 'candidate.moved';
        }
      } else if (input.eventType === 'candidate_deleted') {
        type = 'candidate.deleted';
      }

      let fromStage = detailsData?.from_stage
        ? {
            stageId: detailsData.from_stage.id,
            name: detailsData.from_stage.name,
            category: detailsData.from_stage.category
          }
        : null;

      let toStage = detailsData?.to_stage
        ? {
            stageId: detailsData.to_stage.id,
            name: detailsData.to_stage.name,
            category: detailsData.to_stage.category
          }
        : null;

      let disqualifyReason = detailsData?.disqualify_reason?.name || null;

      return {
        type,
        id: String(input.webhookEventId),
        output: {
          candidate: {
            candidateId: candidateData.id,
            name: candidateData.name || '',
            emails: candidateData.emails || [],
            phones: candidateData.phones || [],
            photoUrl: candidateData.photo_thumb_url || null,
            source: candidateData.source || null,
            createdAt: candidateData.created_at || ''
          },
          offer: offerData
            ? {
                offerId: offerData.id,
                title: offerData.title,
                kind: offerData.kind,
                slug: offerData.slug || null
              }
            : null,
          fromStage,
          toStage,
          disqualifyReason,
          eventSubtype: input.eventSubtype
        }
      };
    }
  })
  .build();
