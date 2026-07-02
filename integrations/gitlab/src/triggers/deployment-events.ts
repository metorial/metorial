import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { GitLabClient } from '../lib/client';
import { gitLabServiceError } from '../lib/errors';
import { spec } from '../spec';

export let deploymentEvents = SlateTrigger.create(spec, {
  name: 'Deployment Events',
  key: 'deployment_events',
  description: 'Triggers when a deployment starts, succeeds, fails, or is canceled.'
})
  .input(
    z.object({
      deploymentId: z.number().describe('Deployment ID'),
      status: z
        .string()
        .describe('Deployment status (created, running, success, failed, canceled)'),
      environment: z.string().describe('Environment name'),
      environmentUrl: z.string().nullable().describe('Environment external URL'),
      projectId: z.number().describe('Project ID'),
      projectName: z.string().describe('Project name'),
      projectUrl: z.string().describe('Project web URL'),
      ref: z.string().describe('Branch or tag'),
      sha: z.string().describe('Commit SHA'),
      userName: z.string().describe('User who triggered the deployment'),
      deployableUrl: z.string().nullable().describe('URL to the deployment job')
    })
  )
  .output(
    z.object({
      deploymentId: z.number().describe('Deployment ID'),
      status: z.string().describe('Deployment status'),
      environment: z.string().describe('Environment name'),
      environmentUrl: z.string().nullable().describe('Environment URL'),
      projectId: z.number().describe('Project ID'),
      projectName: z.string().describe('Project name'),
      ref: z.string().describe('Branch or tag'),
      sha: z.string().describe('Commit SHA'),
      userName: z.string().describe('User who triggered')
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
          'A project ID must be configured to register deployment webhooks'
        );
      }

      let webhook = await client.createProjectWebhook(projectId, {
        url: ctx.input.webhookBaseUrl,
        pushEvents: false,
        tagPushEvents: false,
        mergeRequestsEvents: false,
        issuesEvents: false,
        noteEvents: false,
        pipelineEvents: false,
        jobEvents: false,
        deploymentEvents: true,
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

      if (eventHeader !== 'Deployment Hook') {
        return { inputs: [] };
      }

      let project = data.project || {};

      return {
        inputs: [
          {
            deploymentId: data.deployment_id || 0,
            status: data.status || '',
            environment: data.environment || '',
            environmentUrl: data.environment_external_url || null,
            projectId: project.id || 0,
            projectName: project.name || '',
            projectUrl: project.web_url || '',
            ref: data.ref || '',
            sha: data.sha || '',
            userName: data.user?.username || data.user?.name || '',
            deployableUrl: data.deployable_url || null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `deployment.${ctx.input.status}`,
        id: `deployment_${ctx.input.deploymentId}_${ctx.input.status}`,
        output: {
          deploymentId: ctx.input.deploymentId,
          status: ctx.input.status,
          environment: ctx.input.environment,
          environmentUrl: ctx.input.environmentUrl,
          projectId: ctx.input.projectId,
          projectName: ctx.input.projectName,
          ref: ctx.input.ref,
          sha: ctx.input.sha,
          userName: ctx.input.userName
        }
      };
    }
  })
  .build();
