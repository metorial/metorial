import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let runEventsTrigger = SlateTrigger.create(spec, {
  name: 'Run Events',
  key: 'run_events',
  description:
    'Triggers when Terraform runs change status in a workspace — created, planning, needs attention, applying, completed, or errored. Also covers health assessment events (drift detected, check failures) and auto-destroy events.'
})
  .input(
    z.object({
      notificationId: z.string().describe('Notification configuration ID'),
      trigger: z.string().describe('The notification trigger type'),
      runId: z.string().describe('The run ID'),
      runStatus: z.string().describe('Current run status'),
      runMessage: z.string().describe('Run message'),
      runCreatedAt: z.string().describe('When the run was created'),
      runCreatedBy: z.string().describe('Who created the run'),
      workspaceId: z.string().describe('The workspace ID'),
      workspaceName: z.string().describe('The workspace name'),
      organizationName: z.string().describe('The organization name'),
      runUrl: z.string().describe('URL to the run in the TFC UI')
    })
  )
  .output(
    z.object({
      runId: z.string().describe('The Terraform run ID'),
      runStatus: z.string().describe('Current status of the run'),
      runMessage: z.string().describe('Message describing the run'),
      runCreatedAt: z.string().describe('When the run was created'),
      runCreatedBy: z.string().describe('Who created the run'),
      workspaceId: z.string().describe('The workspace ID'),
      workspaceName: z.string().describe('Name of the workspace'),
      organizationName: z.string().describe('Name of the organization'),
      runUrl: z.string().describe('URL to view the run in Terraform Cloud'),
      notificationTrigger: z.string().describe('The specific notification trigger that fired')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let _client = createClient(ctx);

      // We need to find existing workspaces to register notifications
      // The user must specify which workspace to watch via notification configuration
      // We'll store the webhook URL for reference
      return {
        registrationDetails: {
          webhookUrl: ctx.input.webhookBaseUrl
        }
      };
    },

    autoUnregisterWebhook: async _ctx => {
      // Notification configurations are workspace-scoped in TFC
      // The user manages them via the manage_notification tool
    },

    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!body?.notifications) {
        return { inputs: [] };
      }

      let inputs = (body.notifications as any[]).map((notification: any) => ({
        notificationId: notification.notification_configuration_id || '',
        trigger: notification.trigger || '',
        runId: notification.run_id || '',
        runStatus: notification.run_status || '',
        runMessage: notification.run_message || '',
        runCreatedAt: notification.run_created_at || '',
        runCreatedBy: notification.run_created_by || '',
        workspaceId: notification.workspace_id || '',
        workspaceName: notification.workspace_name || '',
        organizationName: notification.organization_name || '',
        runUrl: notification.run_url || ''
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let triggerType = ctx.input.trigger || 'run.unknown';
      // Normalize trigger to dot notation: "run:completed" -> "run.completed"
      let normalizedType = triggerType.replace(/:/g, '.');

      return {
        type: normalizedType,
        id: `${ctx.input.runId}-${ctx.input.trigger}`,
        output: {
          runId: ctx.input.runId,
          runStatus: ctx.input.runStatus,
          runMessage: ctx.input.runMessage,
          runCreatedAt: ctx.input.runCreatedAt,
          runCreatedBy: ctx.input.runCreatedBy,
          workspaceId: ctx.input.workspaceId,
          workspaceName: ctx.input.workspaceName,
          organizationName: ctx.input.organizationName,
          runUrl: ctx.input.runUrl,
          notificationTrigger: ctx.input.trigger
        }
      };
    }
  })
  .build();
