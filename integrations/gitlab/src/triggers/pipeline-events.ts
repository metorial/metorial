import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { GitLabClient } from '../lib/client';
import { gitLabServiceError } from '../lib/errors';
import { spec } from '../spec';

export let pipelineEvents = SlateTrigger.create(spec, {
  name: 'Pipeline Events',
  key: 'pipeline_events',
  description:
    'Triggers when a CI/CD pipeline status changes (e.g. pending, running, success, failed, canceled).'
})
  .input(
    z.object({
      pipelineId: z.number().describe('Pipeline ID'),
      status: z.string().describe('Pipeline status'),
      ref: z.string().describe('Branch or tag'),
      sha: z.string().describe('Commit SHA'),
      source: z.string().nullable().describe('Pipeline source'),
      stages: z.array(z.string()).describe('Pipeline stages'),
      projectId: z.number().describe('Project ID'),
      projectName: z.string().describe('Project name'),
      projectUrl: z.string().describe('Project web URL'),
      pipelineUrl: z.string().describe('Pipeline web URL'),
      userName: z.string().describe('User who triggered'),
      duration: z.number().nullable().describe('Pipeline duration in seconds'),
      createdAt: z.string().describe('Creation timestamp'),
      finishedAt: z.string().nullable().describe('Finish timestamp')
    })
  )
  .output(
    z.object({
      pipelineId: z.number().describe('Pipeline ID'),
      status: z.string().describe('Pipeline status'),
      ref: z.string().describe('Branch or tag name'),
      sha: z.string().describe('Commit SHA'),
      projectId: z.number().describe('Project ID'),
      projectName: z.string().describe('Project name'),
      pipelineUrl: z.string().describe('Pipeline web URL'),
      userName: z.string().describe('User who triggered'),
      duration: z.number().nullable().describe('Duration in seconds'),
      stages: z.array(z.string()).describe('Pipeline stages')
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
          'A project ID must be configured to register pipeline webhooks'
        );
      }

      let webhook = await client.createProjectWebhook(projectId, {
        url: ctx.input.webhookBaseUrl,
        pushEvents: false,
        tagPushEvents: false,
        mergeRequestsEvents: false,
        issuesEvents: false,
        noteEvents: false,
        pipelineEvents: true,
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

      if (eventHeader !== 'Pipeline Hook') {
        return { inputs: [] };
      }

      let attrs = data.object_attributes || {};
      let project = data.project || {};

      return {
        inputs: [
          {
            pipelineId: attrs.id || 0,
            status: attrs.status || '',
            ref: attrs.ref || '',
            sha: attrs.sha || '',
            source: attrs.source || null,
            stages: attrs.stages || [],
            projectId: project.id || 0,
            projectName: project.name || '',
            projectUrl: project.web_url || '',
            pipelineUrl: project.web_url ? `${project.web_url}/-/pipelines/${attrs.id}` : '',
            userName: data.user?.username || data.user?.name || '',
            duration: attrs.duration || null,
            createdAt: attrs.created_at || new Date().toISOString(),
            finishedAt: attrs.finished_at || null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `pipeline.${ctx.input.status}`,
        id: `pipeline_${ctx.input.pipelineId}_${ctx.input.status}`,
        output: {
          pipelineId: ctx.input.pipelineId,
          status: ctx.input.status,
          ref: ctx.input.ref,
          sha: ctx.input.sha,
          projectId: ctx.input.projectId,
          projectName: ctx.input.projectName,
          pipelineUrl: ctx.input.pipelineUrl,
          userName: ctx.input.userName,
          duration: ctx.input.duration,
          stages: ctx.input.stages
        }
      };
    }
  })
  .build();
