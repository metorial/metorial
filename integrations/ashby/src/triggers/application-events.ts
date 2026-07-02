import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
import { spec } from '../spec';

let webhookTypes = ['applicationSubmit', 'applicationUpdate'] as const;

export let applicationEventsTrigger = SlateTrigger.create(spec, {
  name: 'Application Events',
  key: 'application_events',
  description: 'Triggers when an application is submitted or updated.'
})
  .input(
    z.object({
      webhookType: z.string().describe('The type of webhook event'),
      webhookActionId: z
        .string()
        .describe('Unique ID grouping related webhook events from the same action'),
      applicationId: z.string().describe('The application ID'),
      rawPayload: z.any().describe('The full webhook payload')
    })
  )
  .output(
    z.object({
      applicationId: z.string().describe('The application ID'),
      status: z
        .string()
        .optional()
        .describe('Application status (Hired, Archived, Active, Lead)'),
      candidateId: z.string().optional().describe('The candidate ID'),
      candidateName: z.string().optional().describe('The candidate name'),
      jobId: z.string().optional().describe('The job ID'),
      jobTitle: z.string().optional().describe('The job title'),
      currentStageId: z.string().optional().describe('Current interview stage ID'),
      currentStageTitle: z.string().optional().describe('Current interview stage title'),
      sourceId: z.string().optional().describe('Source ID'),
      sourceTitle: z.string().optional().describe('Source title')
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

      let applicationId = data.data?.application?.id || data.data?.applicationId || '';

      return {
        inputs: [
          {
            webhookType: data.action || 'unknown',
            webhookActionId: data.webhookActionId || crypto.randomUUID(),
            applicationId,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new AshbyClient({ token: ctx.auth.token });
      let payload = ctx.input.rawPayload;
      let applicationData = payload.data?.application || {};

      let candidateId = applicationData.candidate?.id;
      let candidateName = applicationData.candidate?.name;
      let jobId = applicationData.job?.id;
      let jobTitle = applicationData.job?.title;
      let currentStageId = applicationData.currentInterviewStage?.id;
      let currentStageTitle = applicationData.currentInterviewStage?.title;
      let status = applicationData.status;
      let sourceId = applicationData.source?.id;
      let sourceTitle = applicationData.source?.title;

      if (ctx.input.applicationId) {
        try {
          let appInfo = await client.getApplication(ctx.input.applicationId);
          let app = appInfo.results;
          candidateId = app?.candidate?.id || candidateId;
          candidateName = app?.candidate?.name || candidateName;
          jobId = app?.job?.id || jobId;
          jobTitle = app?.job?.title || jobTitle;
          currentStageId = app?.currentInterviewStage?.id || currentStageId;
          currentStageTitle = app?.currentInterviewStage?.title || currentStageTitle;
          status = app?.status || status;
          sourceId = app?.source?.id || sourceId;
          sourceTitle = app?.source?.title || sourceTitle;
        } catch {
          // Use data from the webhook payload
        }
      }

      let eventTypeMap: Record<string, string> = {
        applicationSubmit: 'application.submitted',
        applicationUpdate: 'application.updated'
      };

      return {
        type: eventTypeMap[ctx.input.webhookType] || `application.${ctx.input.webhookType}`,
        id: ctx.input.webhookActionId,
        output: {
          applicationId: ctx.input.applicationId,
          status,
          candidateId,
          candidateName,
          jobId,
          jobTitle,
          currentStageId,
          currentStageTitle,
          sourceId,
          sourceTitle
        }
      };
    }
  })
  .build();
