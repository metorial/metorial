import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let vcsInfoSchema = z
  .object({
    providerName: z.string().optional(),
    branch: z.string().optional(),
    tag: z.string().optional(),
    revision: z.string().optional(),
    repositoryUrl: z.string().optional(),
    commitSubject: z.string().optional(),
    commitBody: z.string().optional(),
    authorName: z.string().optional(),
    authorEmail: z.string().optional()
  })
  .optional();

export let buildEvent = SlateTrigger.create(spec, {
  name: 'Build Event',
  key: 'build_event',
  description:
    'Triggered when a workflow or job completes in a CircleCI project. Covers both workflow-completed and job-completed events with full pipeline, workflow, job, and VCS details.',
  instructions: [
    'Configure the webhook URL in your CircleCI project settings under Webhooks, subscribing to workflow-completed and/or job-completed events.'
  ]
})
  .input(
    z.object({
      eventType: z
        .enum(['workflow-completed', 'job-completed'])
        .describe('Type of CircleCI event'),
      eventId: z.string().describe('Unique event ID for deduplication'),
      happenedAt: z.string().describe('When the event occurred'),
      projectId: z.string(),
      projectName: z.string().optional(),
      projectSlug: z.string().optional(),
      organizationId: z.string().optional(),
      organizationName: z.string().optional(),
      pipelineId: z.string(),
      pipelineNumber: z.number().optional(),
      workflowId: z.string(),
      workflowName: z.string().optional(),
      workflowStatus: z.string().optional(),
      workflowCreatedAt: z.string().optional(),
      workflowStoppedAt: z.string().optional(),
      workflowUrl: z.string().optional(),
      jobId: z.string().optional(),
      jobName: z.string().optional(),
      jobStatus: z.string().optional(),
      jobNumber: z.number().optional(),
      jobStartedAt: z.string().optional(),
      jobStoppedAt: z.string().optional(),
      vcs: vcsInfoSchema
    })
  )
  .output(
    z.object({
      projectId: z.string(),
      projectName: z.string().optional(),
      projectSlug: z.string().optional(),
      organizationId: z.string().optional(),
      organizationName: z.string().optional(),
      pipelineId: z.string(),
      pipelineNumber: z.number().optional(),
      workflowId: z.string(),
      workflowName: z.string().optional(),
      workflowStatus: z.string().optional(),
      workflowCreatedAt: z.string().optional(),
      workflowStoppedAt: z.string().optional(),
      workflowUrl: z.string().optional(),
      jobId: z.string().optional(),
      jobName: z.string().optional(),
      jobStatus: z.string().optional(),
      jobNumber: z.number().optional(),
      jobStartedAt: z.string().optional(),
      jobStoppedAt: z.string().optional(),
      branch: z.string().optional(),
      tag: z.string().optional(),
      revision: z.string().optional(),
      repositoryUrl: z.string().optional(),
      commitSubject: z.string().optional(),
      authorName: z.string().optional(),
      authorEmail: z.string().optional()
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.input.request.json()) as any;

      let eventType = body.type as 'workflow-completed' | 'job-completed';

      let vcsData = body.pipeline?.vcs;
      let triggerParams = body.pipeline?.trigger_parameters;

      let branch = vcsData?.branch || triggerParams?.git?.branch;
      let tag = vcsData?.tag || triggerParams?.git?.tag;
      let revision = vcsData?.revision || triggerParams?.git?.checkout_sha;
      let repositoryUrl = vcsData?.origin_repository_url || triggerParams?.git?.checkout_url;
      let commitSubject = vcsData?.commit?.subject || triggerParams?.gitlab?.commit_title;
      let commitBody = vcsData?.commit?.body || triggerParams?.gitlab?.commit_message;
      let authorName =
        vcsData?.commit?.author?.name || triggerParams?.gitlab?.commit_author_name;
      let authorEmail =
        vcsData?.commit?.author?.email || triggerParams?.gitlab?.commit_author_email;

      let input: any = {
        eventType,
        eventId: body.id,
        happenedAt: body.happened_at,
        projectId: body.project?.id,
        projectName: body.project?.name,
        projectSlug: body.project?.slug,
        organizationId: body.organization?.id,
        organizationName: body.organization?.name,
        pipelineId: body.pipeline?.id,
        pipelineNumber: body.pipeline?.number,
        workflowId: body.workflow?.id,
        workflowName: body.workflow?.name,
        workflowCreatedAt: body.workflow?.created_at,
        workflowStoppedAt: body.workflow?.stopped_at,
        workflowUrl: body.workflow?.url,
        vcs: {
          providerName: vcsData?.provider_name || body.pipeline?.trigger?.type,
          branch,
          tag,
          revision,
          repositoryUrl,
          commitSubject,
          commitBody,
          authorName,
          authorEmail
        }
      };

      if (eventType === 'workflow-completed') {
        input.workflowStatus = body.workflow?.status;
      } else if (eventType === 'job-completed') {
        input.jobId = body.job?.id;
        input.jobName = body.job?.name;
        input.jobStatus = body.job?.status;
        input.jobNumber = body.job?.number;
        input.jobStartedAt = body.job?.started_at;
        input.jobStoppedAt = body.job?.stopped_at;
      }

      return {
        inputs: [input]
      };
    },

    handleEvent: async ctx => {
      let type =
        ctx.input.eventType === 'workflow-completed' ? 'workflow.completed' : 'job.completed';

      return {
        type,
        id: ctx.input.eventId,
        output: {
          projectId: ctx.input.projectId,
          projectName: ctx.input.projectName,
          projectSlug: ctx.input.projectSlug,
          organizationId: ctx.input.organizationId,
          organizationName: ctx.input.organizationName,
          pipelineId: ctx.input.pipelineId,
          pipelineNumber: ctx.input.pipelineNumber,
          workflowId: ctx.input.workflowId,
          workflowName: ctx.input.workflowName,
          workflowStatus: ctx.input.workflowStatus,
          workflowCreatedAt: ctx.input.workflowCreatedAt,
          workflowStoppedAt: ctx.input.workflowStoppedAt,
          workflowUrl: ctx.input.workflowUrl,
          jobId: ctx.input.jobId,
          jobName: ctx.input.jobName,
          jobStatus: ctx.input.jobStatus,
          jobNumber: ctx.input.jobNumber,
          jobStartedAt: ctx.input.jobStartedAt,
          jobStoppedAt: ctx.input.jobStoppedAt,
          branch: ctx.input.vcs?.branch,
          tag: ctx.input.vcs?.tag,
          revision: ctx.input.vcs?.revision,
          repositoryUrl: ctx.input.vcs?.repositoryUrl,
          commitSubject: ctx.input.vcs?.commitSubject,
          authorName: ctx.input.vcs?.authorName,
          authorEmail: ctx.input.vcs?.authorEmail
        }
      };
    }
  })
  .build();
