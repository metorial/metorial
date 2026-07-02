import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let resourceSchema = z.object({
  workspaceId: z.string().nullable().describe('Workspace ID'),
  workspaceName: z.string().nullable().describe('Workspace name'),
  projectId: z.string().nullable().describe('Project ID'),
  projectName: z.string().nullable().describe('Project name'),
  environmentId: z.string().nullable().describe('Environment ID'),
  environmentName: z.string().nullable().describe('Environment name'),
  serviceId: z.string().nullable().describe('Service ID'),
  serviceName: z.string().nullable().describe('Service name'),
  deploymentId: z.string().nullable().describe('Deployment ID')
});

let detailsSchema = z.object({
  deploymentId: z.string().nullable().describe('Deployment ID from details'),
  source: z.string().nullable().describe('Deployment source (e.g., GitHub)'),
  status: z.string().nullable().describe('Deployment status'),
  branch: z.string().nullable().describe('Git branch'),
  commitHash: z.string().nullable().describe('Git commit hash'),
  commitAuthor: z.string().nullable().describe('Git commit author'),
  commitMessage: z.string().nullable().describe('Git commit message')
});

export let projectWebhookTrigger = SlateTrigger.create(spec, {
  name: 'Project Webhook',
  key: 'project_webhook',
  description:
    'Receives webhook events from a Railway project including deployment status changes, volume usage alerts, and resource monitoring alerts. Configure the webhook URL in your Railway project settings.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Event type (e.g., "Deployment.failed", "Deployment.success")'),
      eventId: z.string().describe('Unique event identifier'),
      timestamp: z.string().describe('Event timestamp'),
      severity: z.string().nullable().describe('Event severity'),
      resource: resourceSchema.describe('Resource context for the event'),
      details: detailsSchema.nullable().describe('Event-specific details')
    })
  )
  .output(
    z.object({
      eventType: z.string().describe('Normalized event type'),
      timestamp: z.string().describe('Event timestamp'),
      severity: z.string().nullable().describe('Event severity'),
      workspaceId: z.string().nullable().describe('Workspace ID'),
      workspaceName: z.string().nullable().describe('Workspace name'),
      projectId: z.string().nullable().describe('Project ID'),
      projectName: z.string().nullable().describe('Project name'),
      environmentId: z.string().nullable().describe('Environment ID'),
      environmentName: z.string().nullable().describe('Environment name'),
      serviceId: z.string().nullable().describe('Service ID'),
      serviceName: z.string().nullable().describe('Service name'),
      deploymentId: z.string().nullable().describe('Deployment ID'),
      source: z.string().nullable().describe('Deployment source'),
      status: z.string().nullable().describe('Deployment status'),
      branch: z.string().nullable().describe('Git branch'),
      commitHash: z.string().nullable().describe('Git commit hash'),
      commitAuthor: z.string().nullable().describe('Git commit author'),
      commitMessage: z.string().nullable().describe('Git commit message')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!data?.type) {
        return { inputs: [] };
      }

      let resource = data.resource || {};
      let details = data.details || {};

      let eventId = [
        data.type,
        resource.deployment?.id || details.id || '',
        data.timestamp || ''
      ].join('-');

      return {
        inputs: [
          {
            eventType: data.type,
            eventId,
            timestamp: data.timestamp || new Date().toISOString(),
            severity: data.severity ?? null,
            resource: {
              workspaceId: resource.workspace?.id ?? null,
              workspaceName: resource.workspace?.name ?? null,
              projectId: resource.project?.id ?? null,
              projectName: resource.project?.name ?? null,
              environmentId: resource.environment?.id ?? null,
              environmentName: resource.environment?.name ?? null,
              serviceId: resource.service?.id ?? null,
              serviceName: resource.service?.name ?? null,
              deploymentId: resource.deployment?.id ?? null
            },
            details: {
              deploymentId: details.id ?? null,
              source: details.source ?? null,
              status: details.status ?? null,
              branch: details.branch ?? null,
              commitHash: details.commitHash ?? null,
              commitAuthor: details.commitAuthor ?? null,
              commitMessage: details.commitMessage ?? null
            }
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let rawType = ctx.input.eventType || 'unknown';
      let normalizedType = rawType.toLowerCase().replace(/\./g, '.');

      let deploymentId =
        ctx.input.resource.deploymentId || ctx.input.details?.deploymentId || null;

      return {
        type: normalizedType,
        id: ctx.input.eventId,
        output: {
          eventType: rawType,
          timestamp: ctx.input.timestamp,
          severity: ctx.input.severity,
          workspaceId: ctx.input.resource.workspaceId,
          workspaceName: ctx.input.resource.workspaceName,
          projectId: ctx.input.resource.projectId,
          projectName: ctx.input.resource.projectName,
          environmentId: ctx.input.resource.environmentId,
          environmentName: ctx.input.resource.environmentName,
          serviceId: ctx.input.resource.serviceId,
          serviceName: ctx.input.resource.serviceName,
          deploymentId,
          source: ctx.input.details?.source ?? null,
          status: ctx.input.details?.status ?? null,
          branch: ctx.input.details?.branch ?? null,
          commitHash: ctx.input.details?.commitHash ?? null,
          commitAuthor: ctx.input.details?.commitAuthor ?? null,
          commitMessage: ctx.input.details?.commitMessage ?? null
        }
      };
    }
  })
  .build();
