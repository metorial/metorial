import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { GitLabClient } from '../lib/client';
import { gitLabServiceError } from '../lib/errors';
import { spec } from '../spec';

export let mergeRequestEvents = SlateTrigger.create(spec, {
  name: 'Merge Request Events',
  key: 'merge_request_events',
  description:
    'Triggers when a merge request is created, updated, merged, closed, reopened, or approved.'
})
  .input(
    z.object({
      action: z
        .string()
        .describe('MR action (open, close, reopen, update, merge, approved, unapproved)'),
      mergeRequestId: z.number().describe('Global merge request ID'),
      mergeRequestIid: z.number().describe('MR IID within the project'),
      title: z.string().describe('MR title'),
      description: z.string().nullable().describe('MR description'),
      state: z.string().describe('MR state'),
      sourceBranch: z.string().describe('Source branch'),
      targetBranch: z.string().describe('Target branch'),
      projectId: z.number().describe('Project ID'),
      projectName: z.string().describe('Project name'),
      projectUrl: z.string().describe('Project web URL'),
      mergeRequestUrl: z.string().describe('MR web URL'),
      authorUsername: z.string().describe('Author username'),
      labels: z.array(z.string()).describe('Applied labels'),
      assigneeUsernames: z.array(z.string()).describe('Assignee usernames'),
      reviewerUsernames: z.array(z.string()).describe('Reviewer usernames'),
      draft: z.boolean().describe('Whether this is a draft MR'),
      mergeStatus: z.string().nullable().describe('Merge status')
    })
  )
  .output(
    z.object({
      mergeRequestIid: z.number().describe('MR IID within the project'),
      title: z.string().describe('MR title'),
      state: z.string().describe('MR state'),
      action: z.string().describe('Action that triggered the event'),
      sourceBranch: z.string().describe('Source branch'),
      targetBranch: z.string().describe('Target branch'),
      projectId: z.number().describe('Project ID'),
      projectName: z.string().describe('Project name'),
      mergeRequestUrl: z.string().describe('MR web URL'),
      authorUsername: z.string().describe('Author username'),
      labels: z.array(z.string()).describe('Applied labels'),
      draft: z.boolean().describe('Whether this is a draft MR')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new GitLabClient({
        token: ctx.auth.token,
        instanceUrl: ctx.auth.instanceUrl
      });

      let projectId = (ctx as any).state?.projectId || (ctx as any).config?.projectId;
      if (!projectId) {
        throw gitLabServiceError(
          'A project ID must be configured to register merge request webhooks'
        );
      }

      let webhook = await client.createProjectWebhook(projectId, {
        url: ctx.input.webhookBaseUrl,
        pushEvents: false,
        tagPushEvents: false,
        mergeRequestsEvents: true,
        issuesEvents: false,
        noteEvents: false,
        pipelineEvents: false,
        jobEvents: false,
        deploymentEvents: false,
        releasesEvents: false
      });

      return {
        registrationDetails: {
          webhookId: webhook.id,
          projectId: projectId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new GitLabClient({
        token: ctx.auth.token,
        instanceUrl: ctx.auth.instanceUrl
      });

      let details = ctx.input.registrationDetails as { webhookId: number; projectId: string };
      await client.deleteProjectWebhook(details.projectId, details.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let eventHeader = ctx.request.headers.get('X-Gitlab-Event');

      if (eventHeader !== 'Merge Request Hook') {
        return { inputs: [] };
      }

      let attrs = data.object_attributes || {};
      let project = data.project || {};

      return {
        inputs: [
          {
            action: attrs.action || 'update',
            mergeRequestId: attrs.id || 0,
            mergeRequestIid: attrs.iid || 0,
            title: attrs.title || '',
            description: attrs.description || null,
            state: attrs.state || '',
            sourceBranch: attrs.source_branch || '',
            targetBranch: attrs.target_branch || '',
            projectId: project.id || 0,
            projectName: project.name || '',
            projectUrl: project.web_url || '',
            mergeRequestUrl: attrs.url || '',
            authorUsername: data.user?.username || '',
            labels: (data.labels || []).map((l: any) => l.title),
            assigneeUsernames: (data.assignees || []).map((a: any) => a.username),
            reviewerUsernames: (data.reviewers || []).map((r: any) => r.username),
            draft: attrs.draft || false,
            mergeStatus: attrs.merge_status || null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `merge_request.${ctx.input.action}`,
        id: `mr_${ctx.input.mergeRequestId}_${ctx.input.action}_${Date.now()}`,
        output: {
          mergeRequestIid: ctx.input.mergeRequestIid,
          title: ctx.input.title,
          state: ctx.input.state,
          action: ctx.input.action,
          sourceBranch: ctx.input.sourceBranch,
          targetBranch: ctx.input.targetBranch,
          projectId: ctx.input.projectId,
          projectName: ctx.input.projectName,
          mergeRequestUrl: ctx.input.mergeRequestUrl,
          authorUsername: ctx.input.authorUsername,
          labels: ctx.input.labels,
          draft: ctx.input.draft
        }
      };
    }
  })
  .build();
