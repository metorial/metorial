import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
import { spec } from '../spec';

let webhookTypes = [
  'candidateHire',
  'candidateStageChange',
  'candidateDelete',
  'candidateMerge'
] as const;

export let candidateEventsTrigger = SlateTrigger.create(spec, {
  name: 'Candidate Events',
  key: 'candidate_events',
  description:
    'Triggers when a candidate is hired, changes interview stage, is deleted, or is merged with another candidate.'
})
  .input(
    z.object({
      webhookType: z.string().describe('The type of webhook event'),
      webhookActionId: z
        .string()
        .describe('Unique ID grouping related webhook events from the same action'),
      candidateId: z.string().describe('The candidate ID'),
      applicationId: z.string().optional().describe('The application ID if applicable'),
      rawPayload: z.any().describe('The full webhook payload')
    })
  )
  .output(
    z.object({
      candidateId: z.string().describe('The candidate ID'),
      candidateName: z.string().optional().describe('The candidate name'),
      applicationId: z.string().optional().describe('Related application ID'),
      jobId: z.string().optional().describe('Related job ID'),
      jobTitle: z.string().optional().describe('Related job title'),
      currentStageId: z.string().optional().describe('Current interview stage ID'),
      currentStageTitle: z.string().optional().describe('Current interview stage title'),
      status: z.string().optional().describe('Application status'),
      mergedIntoCandidateId: z
        .string()
        .optional()
        .describe('ID of the candidate this was merged into')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new AshbyClient({ token: ctx.auth.token });
      let secretToken = crypto.randomUUID();
      let registrations: Array<{ webhookId: string; webhookType: string }> = [];

      for (let webhookType of webhookTypes) {
        let response = await client.createWebhook({
          webhookType,
          requestUrl: ctx.input.webhookBaseUrl,
          secretToken
        });
        registrations.push({
          webhookId: response.results.id,
          webhookType
        });
      }

      return {
        registrationDetails: {
          webhookIds: registrations,
          secretToken
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new AshbyClient({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as {
        webhookIds: Array<{ webhookId: string }>;
      };

      for (let registration of details.webhookIds) {
        await client.deleteWebhook(registration.webhookId);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      let candidateId = data.data?.candidate?.id || data.data?.candidateId || '';
      let applicationId = data.data?.application?.id || data.data?.applicationId;

      return {
        inputs: [
          {
            webhookType: data.action || 'unknown',
            webhookActionId: data.webhookActionId || crypto.randomUUID(),
            candidateId,
            applicationId,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new AshbyClient({ token: ctx.auth.token });
      let payload = ctx.input.rawPayload;
      let candidateData = payload.data?.candidate || {};
      let applicationData = payload.data?.application || {};

      let candidateName = candidateData.name;
      let jobTitle: string | undefined;
      let jobId: string | undefined;
      let currentStageId: string | undefined;
      let currentStageTitle: string | undefined;
      let status: string | undefined;
      let mergedIntoCandidateId: string | undefined;

      if (ctx.input.candidateId && ctx.input.webhookType !== 'candidateDelete') {
        try {
          let candidateInfo = await client.getCandidate(ctx.input.candidateId);
          candidateName = candidateInfo.results?.name || candidateName;
        } catch {
          // Use data from the webhook payload
        }
      }

      if (ctx.input.applicationId) {
        try {
          let appInfo = await client.getApplication(ctx.input.applicationId);
          let app = appInfo.results;
          jobTitle = app?.job?.title;
          jobId = app?.job?.id;
          currentStageId = app?.currentInterviewStage?.id;
          currentStageTitle = app?.currentInterviewStage?.title;
          status = app?.status;
        } catch {
          // Use data from the webhook payload
          jobTitle = applicationData.job?.title;
          jobId = applicationData.job?.id;
          currentStageId = applicationData.currentInterviewStage?.id;
          currentStageTitle = applicationData.currentInterviewStage?.title;
          status = applicationData.status;
        }
      }

      if (ctx.input.webhookType === 'candidateMerge') {
        mergedIntoCandidateId = payload.data?.mergedIntoCandidate?.id;
      }

      let eventTypeMap: Record<string, string> = {
        candidateHire: 'candidate.hired',
        candidateStageChange: 'candidate.stage_changed',
        candidateDelete: 'candidate.deleted',
        candidateMerge: 'candidate.merged'
      };

      return {
        type: eventTypeMap[ctx.input.webhookType] || `candidate.${ctx.input.webhookType}`,
        id: ctx.input.webhookActionId,
        output: {
          candidateId: ctx.input.candidateId,
          candidateName,
          applicationId: ctx.input.applicationId,
          jobId,
          jobTitle,
          currentStageId,
          currentStageTitle,
          status,
          mergedIntoCandidateId
        }
      };
    }
  })
  .build();
