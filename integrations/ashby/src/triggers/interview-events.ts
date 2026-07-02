import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
import { spec } from '../spec';

let webhookTypes = [
  'interviewPlanTransition',
  'interviewScheduleCreate',
  'interviewScheduleUpdate'
] as const;

export let interviewEventsTrigger = SlateTrigger.create(spec, {
  name: 'Interview Events',
  key: 'interview_events',
  description:
    'Triggers when an interview plan transition occurs, or when an interview schedule is created or updated.'
})
  .input(
    z.object({
      webhookType: z.string().describe('The type of webhook event'),
      webhookActionId: z
        .string()
        .describe('Unique ID grouping related webhook events from the same action'),
      interviewScheduleId: z.string().optional().describe('The interview schedule ID'),
      applicationId: z.string().optional().describe('The application ID'),
      rawPayload: z.any().describe('The full webhook payload')
    })
  )
  .output(
    z.object({
      interviewScheduleId: z.string().optional().describe('The interview schedule ID'),
      applicationId: z.string().optional().describe('The application ID'),
      candidateId: z.string().optional().describe('The candidate ID'),
      candidateName: z.string().optional().describe('The candidate name'),
      jobId: z.string().optional().describe('The job ID'),
      jobTitle: z.string().optional().describe('The job title'),
      interviewStageId: z.string().optional().describe('The interview stage ID'),
      interviewStageTitle: z.string().optional().describe('The interview stage title')
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

      let interviewScheduleId =
        data.data?.interviewSchedule?.id || data.data?.interviewScheduleId;
      let applicationId = data.data?.application?.id || data.data?.applicationId;

      return {
        inputs: [
          {
            webhookType: data.action || 'unknown',
            webhookActionId: data.webhookActionId || crypto.randomUUID(),
            interviewScheduleId,
            applicationId,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new AshbyClient({ token: ctx.auth.token });
      let payload = ctx.input.rawPayload;

      let candidateId: string | undefined;
      let candidateName: string | undefined;
      let jobId: string | undefined;
      let jobTitle: string | undefined;
      let interviewStageId: string | undefined;
      let interviewStageTitle: string | undefined;

      if (ctx.input.applicationId) {
        try {
          let appInfo = await client.getApplication(ctx.input.applicationId);
          let app = appInfo.results;
          candidateId = app?.candidate?.id;
          candidateName = app?.candidate?.name;
          jobId = app?.job?.id;
          jobTitle = app?.job?.title;
          interviewStageId = app?.currentInterviewStage?.id;
          interviewStageTitle = app?.currentInterviewStage?.title;
        } catch {
          let appData = payload.data?.application || {};
          candidateId = appData.candidate?.id;
          candidateName = appData.candidate?.name;
          jobId = appData.job?.id;
          jobTitle = appData.job?.title;
          interviewStageId = appData.currentInterviewStage?.id;
          interviewStageTitle = appData.currentInterviewStage?.title;
        }
      }

      let eventTypeMap: Record<string, string> = {
        interviewPlanTransition: 'interview.plan_transition',
        interviewScheduleCreate: 'interview_schedule.created',
        interviewScheduleUpdate: 'interview_schedule.updated'
      };

      return {
        type: eventTypeMap[ctx.input.webhookType] || `interview.${ctx.input.webhookType}`,
        id: ctx.input.webhookActionId,
        output: {
          interviewScheduleId: ctx.input.interviewScheduleId,
          applicationId: ctx.input.applicationId,
          candidateId,
          candidateName,
          jobId,
          jobTitle,
          interviewStageId,
          interviewStageTitle
        }
      };
    }
  })
  .build();
