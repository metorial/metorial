import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { EmeliaClient } from '../lib/client';
import { spec } from '../spec';

export let manageAdvancedCampaign = SlateTool.create(spec, {
  name: 'Manage Advanced Campaign',
  key: 'manage_advanced_campaign',
  description: `Create or list multi-channel advanced campaigns that combine email and LinkedIn outreach. Retrieve, start, pause, finish, reactivate, archive or delete campaigns, and manage manual tasks. Use update_advanced_campaign to configure the sequence, sender identities and recipient lists before starting.
- **list**: List all advanced campaigns.
- **create**: Create a new advanced campaign.
- **get_manual_tasks**: Retrieve pending manual tasks for a campaign.
- **update_manual_task**: Update the status of a manual task.`
})
  .input(
    z.object({
      action: z
        .enum([
          'list',
          'create',
          'get_manual_tasks',
          'update_manual_task',
          'get',
          'start',
          'pause',
          'finish',
          'reactivate',
          'archive',
          'delete'
        ])
        .describe('Operation to perform'),
      campaignId: z
        .string()
        .optional()
        .describe('Campaign ID (required except for list and create)'),
      name: z.string().optional().describe('Campaign name (required for create)'),
      taskId: z
        .string()
        .optional()
        .describe('Manual task ID (required for update_manual_task)'),
      contactId: z
        .string()
        .optional()
        .describe('Contact ID returned with a manual task; required for update_manual_task'),
      taskStatus: z
        .string()
        .optional()
        .describe('Manual task status: ok or ko (required for update_manual_task)')
    })
  )
  .output(
    z.object({
      campaigns: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of campaigns'),
      campaign: z.record(z.string(), z.unknown()).optional().describe('Created campaign'),
      tasks: z.array(z.record(z.string(), z.unknown())).optional().describe('Manual tasks'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EmeliaClient(ctx.auth.token);
    let { action, campaignId, name, taskId, taskStatus } = ctx.input;

    if (action === 'list') {
      let campaigns = await client.listAdvancedCampaigns();
      let campaignList = Array.isArray(campaigns) ? campaigns : [];
      return {
        output: { campaigns: campaignList, success: true },
        message: `Retrieved **${campaignList.length}** advanced campaign(s).`
      };
    }

    if (action === 'create') {
      if (!name) throw createApiServiceError('Campaign name is required');
      let campaign = await client.createAdvancedCampaign({ name });
      return {
        output: { campaign, success: true },
        message: `Created advanced campaign **${name}**.`
      };
    }

    if (action === 'get') {
      if (!campaignId) throw createApiServiceError('Campaign ID is required');
      let campaign = await client.getAdvancedCampaign(campaignId);
      return {
        output: { campaign, success: true },
        message: `Retrieved multichannel campaign **${campaignId}**.`
      };
    }
    if (
      action === 'start' ||
      action === 'pause' ||
      action === 'finish' ||
      action === 'reactivate' ||
      action === 'archive' ||
      action === 'delete'
    ) {
      if (!campaignId) throw createApiServiceError('Campaign ID is required');
      await client.changeAdvancedCampaignState(campaignId, action);
      return {
        output: { success: true },
        message: `Completed campaign operation **${action}** for **${campaignId}**.`
      };
    }

    if (action === 'get_manual_tasks') {
      if (!campaignId) throw createApiServiceError('Campaign ID is required');
      let tasks = await client.getAdvancedCampaignManualTasks(campaignId);
      let taskList = Array.isArray(tasks) ? tasks : [];
      return {
        output: { tasks: taskList, success: true },
        message: `Retrieved **${taskList.length}** manual task(s) for campaign **${campaignId}**.`
      };
    }

    if (action === 'update_manual_task') {
      if (!taskId) throw createApiServiceError('Task ID is required');
      if (!taskStatus) throw createApiServiceError('Task status is required');
      if (!campaignId || !ctx.input.contactId)
        throw createApiServiceError(
          'Campaign ID and contact ID are required to update a manual task.'
        );
      await client.updateAdvancedCampaignManualTask(taskId, {
        status: taskStatus,
        campaignId,
        contactId: ctx.input.contactId
      });
      return {
        output: { success: true },
        message: `Updated manual task **${taskId}** to status **${taskStatus}**.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
