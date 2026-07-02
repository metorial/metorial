import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { GitLabClient } from '../lib/client';
import { gitLabServiceError } from '../lib/errors';
import { spec } from '../spec';

export let issueEvents = SlateTrigger.create(spec, {
  name: 'Issue Events',
  key: 'issue_events',
  description:
    'Triggers when an issue is created, updated, closed, or reopened in a GitLab project.'
})
  .input(
    z.object({
      action: z.string().describe('Issue action (open, close, reopen, update)'),
      issueId: z.number().describe('Global issue ID'),
      issueIid: z.number().describe('Issue IID within the project'),
      title: z.string().describe('Issue title'),
      description: z.string().nullable().describe('Issue description'),
      state: z.string().describe('Issue state'),
      projectId: z.number().describe('Project ID'),
      projectName: z.string().describe('Project name'),
      projectUrl: z.string().describe('Project web URL'),
      issueUrl: z.string().describe('Issue web URL'),
      authorUsername: z.string().describe('Author username'),
      labels: z.array(z.string()).describe('Applied labels'),
      assigneeUsernames: z.array(z.string()).describe('Assignee usernames'),
      dueDate: z.string().nullable().describe('Due date'),
      confidential: z.boolean().describe('Whether the issue is confidential')
    })
  )
  .output(
    z.object({
      issueIid: z.number().describe('Issue IID within the project'),
      title: z.string().describe('Issue title'),
      state: z.string().describe('Issue state'),
      action: z.string().describe('Action that triggered the event'),
      projectId: z.number().describe('Project ID'),
      projectName: z.string().describe('Project name'),
      issueUrl: z.string().describe('Issue web URL'),
      authorUsername: z.string().describe('Author username'),
      labels: z.array(z.string()).describe('Applied labels'),
      assigneeUsernames: z.array(z.string()).describe('Assignee usernames'),
      confidential: z.boolean().describe('Whether the issue is confidential')
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
        throw gitLabServiceError('A project ID must be configured to register issue webhooks');
      }

      let webhook = await client.createProjectWebhook(projectId, {
        url: ctx.input.webhookBaseUrl,
        pushEvents: false,
        tagPushEvents: false,
        mergeRequestsEvents: false,
        issuesEvents: true,
        confidentialIssuesEvents: true,
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

      if (eventHeader !== 'Issue Hook' && eventHeader !== 'Confidential Issue Hook') {
        return { inputs: [] };
      }

      let attrs = data.object_attributes || {};
      let project = data.project || {};

      return {
        inputs: [
          {
            action: attrs.action || 'update',
            issueId: attrs.id || 0,
            issueIid: attrs.iid || 0,
            title: attrs.title || '',
            description: attrs.description || null,
            state: attrs.state || '',
            projectId: project.id || 0,
            projectName: project.name || '',
            projectUrl: project.web_url || '',
            issueUrl: attrs.url || '',
            authorUsername: data.user?.username || '',
            labels: (data.labels || []).map((l: any) => l.title),
            assigneeUsernames: (data.assignees || []).map((a: any) => a.username),
            dueDate: attrs.due_date || null,
            confidential: attrs.confidential || false
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `issue.${ctx.input.action}`,
        id: `issue_${ctx.input.issueId}_${ctx.input.action}_${Date.now()}`,
        output: {
          issueIid: ctx.input.issueIid,
          title: ctx.input.title,
          state: ctx.input.state,
          action: ctx.input.action,
          projectId: ctx.input.projectId,
          projectName: ctx.input.projectName,
          issueUrl: ctx.input.issueUrl,
          authorUsername: ctx.input.authorUsername,
          labels: ctx.input.labels,
          assigneeUsernames: ctx.input.assigneeUsernames,
          confidential: ctx.input.confidential
        }
      };
    }
  })
  .build();
