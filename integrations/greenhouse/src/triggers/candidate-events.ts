import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let candidateEventTypes = [
  'candidate_deleted',
  'candidate_hired',
  'candidate_merged',
  'candidate_stage_change',
  'candidate_unhired',
  'candidate_or_prospect_rejected',
  'candidate_or_prospect_unrejected',
  'candidate_or_prospect_updated',
  'candidate_anonymized'
] as const;

export let candidateEventsTrigger = SlateTrigger.create(spec, {
  name: 'Candidate Events',
  key: 'candidate_events',
  description:
    'Triggers when candidate-related events occur in Greenhouse, including hired, rejected, stage change, merged, deleted, unhired, unrejected, updated, and anonymized.'
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
      candidateId: z.string().nullable().describe('The candidate ID'),
      candidateName: z.string().nullable().describe('The candidate full name'),
      applicationId: z.string().nullable().describe('The related application ID'),
      jobId: z.string().nullable().describe('The associated job ID'),
      jobName: z.string().nullable().describe('The associated job name'),
      previousStage: z
        .string()
        .nullable()
        .describe('Previous stage name (for stage change events)'),
      newStage: z.string().nullable().describe('New stage name (for stage change events)'),
      rejectionReason: z
        .string()
        .nullable()
        .describe('Rejection reason (for rejection events)'),
      mergedCandidateId: z
        .string()
        .nullable()
        .describe('The ID of the candidate that was merged into (for merge events)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let eventId = ctx.request.headers.get('Greenhouse-Event-ID') || crypto.randomUUID();
      let action = data?.action ?? 'unknown';

      if (!candidateEventTypes.includes(action)) {
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

      let application = payload.application ?? {};
      let candidate = application?.candidate ?? payload?.candidate ?? {};
      let jobs = application?.jobs ?? [];
      let firstJob = jobs[0] ?? {};

      let typeMap: Record<string, string> = {
        candidate_deleted: 'candidate.deleted',
        candidate_hired: 'candidate.hired',
        candidate_merged: 'candidate.merged',
        candidate_stage_change: 'candidate.stage_changed',
        candidate_unhired: 'candidate.unhired',
        candidate_or_prospect_rejected: 'candidate.rejected',
        candidate_or_prospect_unrejected: 'candidate.unrejected',
        candidate_or_prospect_updated: 'candidate.updated',
        candidate_anonymized: 'candidate.anonymized'
      };

      let type = typeMap[action] ?? `candidate.${action}`;

      return {
        type,
        id: ctx.input.eventId,
        output: {
          candidateId: candidate?.id?.toString() ?? null,
          candidateName:
            candidate?.first_name && candidate?.last_name
              ? `${candidate.first_name} ${candidate.last_name}`
              : null,
          applicationId: application?.id?.toString() ?? null,
          jobId: firstJob?.id?.toString() ?? null,
          jobName: firstJob?.name ?? null,
          previousStage: payload?.previous_stage?.name ?? null,
          newStage: payload?.new_stage?.name ?? application?.current_stage?.name ?? null,
          rejectionReason:
            application?.rejection_reason?.name ?? payload?.rejection_reason?.name ?? null,
          mergedCandidateId:
            payload?.merged_candidate_id?.toString() ??
            payload?.head_candidate?.id?.toString() ??
            null
        }
      };
    }
  })
  .build();
