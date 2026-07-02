import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
import { spec } from '../spec';

let webhookTypes = [
  'jobCreate',
  'jobUpdate',
  'jobPostingUpdate',
  'jobPostingPublish',
  'jobPostingUnpublish'
] as const;

export let jobEventsTrigger = SlateTrigger.create(spec, {
  name: 'Job Events',
  key: 'job_events',
  description:
    'Triggers when a job is created or updated, or when a job posting is published, unpublished, or updated.'
})
  .input(
    z.object({
      webhookType: z.string().describe('The type of webhook event'),
      webhookActionId: z
        .string()
        .describe('Unique ID grouping related webhook events from the same action'),
      jobId: z.string().optional().describe('The job ID'),
      jobPostingId: z.string().optional().describe('The job posting ID'),
      rawPayload: z.any().describe('The full webhook payload')
    })
  )
  .output(
    z.object({
      jobId: z.string().optional().describe('The job ID'),
      jobTitle: z.string().optional().describe('The job title'),
      jobStatus: z.string().optional().describe('The job status'),
      locationId: z.string().optional().describe('Job location ID'),
      departmentId: z.string().optional().describe('Job department ID'),
      jobPostingId: z.string().optional().describe('The job posting ID'),
      jobPostingTitle: z.string().optional().describe('The job posting title'),
      jobPostingStatus: z
        .string()
        .optional()
        .describe('The posting status (published/unpublished)')
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

      let jobId = data.data?.job?.id || data.data?.jobId;
      let jobPostingId = data.data?.jobPosting?.id || data.data?.jobPostingId;

      return {
        inputs: [
          {
            webhookType: data.action || 'unknown',
            webhookActionId: data.webhookActionId || crypto.randomUUID(),
            jobId,
            jobPostingId,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new AshbyClient({ token: ctx.auth.token });
      let payload = ctx.input.rawPayload;

      let jobId = ctx.input.jobId;
      let jobTitle: string | undefined;
      let jobStatus: string | undefined;
      let locationId: string | undefined;
      let departmentId: string | undefined;
      let jobPostingId = ctx.input.jobPostingId;
      let jobPostingTitle: string | undefined;
      let jobPostingStatus: string | undefined;

      let isJobEvent =
        ctx.input.webhookType === 'jobCreate' || ctx.input.webhookType === 'jobUpdate';
      let isPostingEvent = ctx.input.webhookType.startsWith('jobPosting');

      if (isJobEvent && jobId) {
        try {
          let jobInfo = await client.getJob(jobId);
          let job = jobInfo.results;
          jobTitle = job?.title;
          jobStatus = job?.status;
          locationId = job?.locationId;
          departmentId = job?.departmentId;
        } catch {
          let jobData = payload.data?.job || {};
          jobTitle = jobData.title;
          jobStatus = jobData.status;
          locationId = jobData.locationId;
          departmentId = jobData.departmentId;
        }
      }

      if (isPostingEvent && jobPostingId) {
        try {
          let postingInfo = await client.getJobPosting(jobPostingId);
          let posting = postingInfo.results;
          jobPostingTitle = posting?.title;
          jobPostingStatus = posting?.isLive ? 'published' : 'unpublished';
          jobId = posting?.jobId || jobId;
        } catch {
          let postingData = payload.data?.jobPosting || {};
          jobPostingTitle = postingData.title;
          jobPostingStatus =
            ctx.input.webhookType === 'jobPostingUnpublish' ? 'unpublished' : 'published';
        }
      }

      let eventTypeMap: Record<string, string> = {
        jobCreate: 'job.created',
        jobUpdate: 'job.updated',
        jobPostingUpdate: 'job_posting.updated',
        jobPostingPublish: 'job_posting.published',
        jobPostingUnpublish: 'job_posting.unpublished'
      };

      return {
        type: eventTypeMap[ctx.input.webhookType] || `job.${ctx.input.webhookType}`,
        id: ctx.input.webhookActionId,
        output: {
          jobId,
          jobTitle,
          jobStatus,
          locationId,
          departmentId,
          jobPostingId,
          jobPostingTitle,
          jobPostingStatus
        }
      };
    }
  })
  .build();
