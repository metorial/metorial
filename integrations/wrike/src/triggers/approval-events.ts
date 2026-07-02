import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { WrikeClient } from '../lib/client';
import { spec } from '../spec';

export let approvalEvents = SlateTrigger.create(spec, {
  name: 'Approval Events',
  key: 'approval_events',
  description:
    'Triggers on approval workflow changes including status changes, decisions made, and decision resets on both tasks and folders/projects.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of approval event'),
      taskId: z.string().optional().describe('Task ID (if task approval)'),
      folderId: z.string().optional().describe('Folder/project ID (if folder approval)'),
      webhookId: z.string().describe('ID of the webhook that fired'),
      eventAuthorId: z.string().optional().describe('ID of the user who triggered the event'),
      lastUpdatedDate: z.string().optional().describe('Timestamp of the event'),
      oldValue: z.string().optional().describe('Previous approval status'),
      newValue: z.string().optional().describe('New approval status')
    })
  )
  .output(
    z.object({
      taskId: z.string().optional().describe('Task ID (if task approval)'),
      folderId: z.string().optional().describe('Folder/project ID (if folder approval)'),
      eventAuthorId: z.string().optional().describe('ID of the user who triggered the event'),
      lastUpdatedDate: z.string().optional().describe('Timestamp of the event'),
      oldValue: z.string().optional().describe('Previous value'),
      newValue: z.string().optional().describe('New value')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new WrikeClient({
        token: ctx.auth.token,
        host: ctx.auth.host
      });

      let webhook = await client.createWebhook({
        hookUrl: ctx.input.webhookBaseUrl,
        events: [
          'TaskApprovalStatusChanged',
          'TaskApprovalDecisionChanged',
          'TaskApprovalDecisionReset',
          'FolderApprovalStatusChanged',
          'FolderApprovalDecisionChanged',
          'FolderApprovalDecisionReset'
        ]
      });

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new WrikeClient({
        token: ctx.auth.token,
        host: ctx.auth.host
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Array<{
        webhookId: string;
        eventType: string;
        taskId?: string;
        folderId?: string;
        eventAuthorId?: string;
        lastUpdatedDate?: string;
        oldValue?: string;
        newValue?: string;
      }>;

      if (!Array.isArray(body)) {
        return { inputs: [] };
      }

      let inputs = body.map(event => ({
        eventType: event.eventType,
        taskId: event.taskId,
        folderId: event.folderId,
        webhookId: event.webhookId,
        eventAuthorId: event.eventAuthorId,
        lastUpdatedDate: event.lastUpdatedDate,
        oldValue: event.oldValue,
        newValue: event.newValue
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let eventTypeMap: Record<string, string> = {
        TaskApprovalStatusChanged: 'approval.task_status_changed',
        TaskApprovalDecisionChanged: 'approval.task_decision_changed',
        TaskApprovalDecisionReset: 'approval.task_decision_reset',
        FolderApprovalStatusChanged: 'approval.folder_status_changed',
        FolderApprovalDecisionChanged: 'approval.folder_decision_changed',
        FolderApprovalDecisionReset: 'approval.folder_decision_reset'
      };

      let type =
        eventTypeMap[ctx.input.eventType] || `approval.${ctx.input.eventType.toLowerCase()}`;
      let resourceId = ctx.input.taskId || ctx.input.folderId || 'unknown';

      return {
        type,
        id: `${resourceId}-${ctx.input.eventType}-${ctx.input.lastUpdatedDate || Date.now()}`,
        output: {
          taskId: ctx.input.taskId,
          folderId: ctx.input.folderId,
          eventAuthorId: ctx.input.eventAuthorId,
          lastUpdatedDate: ctx.input.lastUpdatedDate,
          oldValue: ctx.input.oldValue,
          newValue: ctx.input.newValue
        }
      };
    }
  })
  .build();
