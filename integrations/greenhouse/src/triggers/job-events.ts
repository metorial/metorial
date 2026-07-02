import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let jobEventTypes = [
  'job_created',
  'job_updated',
  'job_deleted',
  'job_approved',
  'job_post_created',
  'job_post_updated',
  'job_post_deleted',
  'job_stage_deleted'
] as const;

export let jobEventsTrigger = SlateTrigger.create(spec, {
  name: 'Job Events',
  key: 'job_events',
  description:
    'Triggers when job-related events occur in Greenhouse, including job created/updated/deleted/approved, job post created/updated/deleted, and job stage deleted.'
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
      jobId: z.string().nullable().describe('The job ID'),
      jobName: z.string().nullable().describe('The job name'),
      status: z.string().nullable().describe('The job status'),
      departments: z
        .array(z.object({ departmentId: z.string(), name: z.string() }))
        .describe('Job departments'),
      offices: z
        .array(z.object({ officeId: z.string(), name: z.string() }))
        .describe('Job offices'),
      jobPostId: z.string().nullable().describe('The job post ID (for job post events)'),
      jobPostTitle: z.string().nullable().describe('The job post title (for job post events)'),
      stageId: z.string().nullable().describe('The stage ID (for stage deleted events)'),
      stageName: z.string().nullable().describe('The stage name (for stage deleted events)'),
      approvalFlowType: z
        .string()
        .nullable()
        .describe('The approval flow type (for job approved events)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let eventId = ctx.request.headers.get('Greenhouse-Event-ID') || crypto.randomUUID();
      let action = data?.action ?? 'unknown';

      if (!jobEventTypes.includes(action)) {
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

      let job = payload.job ?? payload;
      let jobPost = payload.job_post ?? {};
      let stage = payload.job_stage ?? {};
      let isJobPostEvent = action.startsWith('job_post_');
      let isStageEvent = action === 'job_stage_deleted';

      let type = action.replace('_', '.');
      if (isJobPostEvent) {
        type = `job_post.${action.replace('job_post_', '')}`;
      } else if (isStageEvent) {
        type = 'job_stage.deleted';
      } else {
        type = `job.${action.replace('job_', '')}`;
      }

      let departments = (job?.departments ?? []).map((d: any) => ({
        departmentId: d.id?.toString() ?? '',
        name: d.name ?? ''
      }));

      let offices = (job?.offices ?? []).map((o: any) => ({
        officeId: o.id?.toString() ?? '',
        name: o.name ?? ''
      }));

      return {
        type,
        id: ctx.input.eventId,
        output: {
          jobId: job?.id?.toString() ?? null,
          jobName: job?.name ?? null,
          status: job?.status ?? null,
          departments,
          offices,
          jobPostId: isJobPostEvent ? (jobPost?.id?.toString() ?? null) : null,
          jobPostTitle: isJobPostEvent ? (jobPost?.title ?? null) : null,
          stageId: isStageEvent ? (stage?.id?.toString() ?? null) : null,
          stageName: isStageEvent ? (stage?.name ?? null) : null,
          approvalFlowType:
            action === 'job_approved' ? (payload?.approval_flow_type ?? null) : null
        }
      };
    }
  })
  .build();
