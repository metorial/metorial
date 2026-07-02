import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCampaign = SlateTool.create(spec, {
  name: 'Manage Campaign',
  key: 'manage_campaign',
  description: `Create, update, delete, or run outbound campaigns. Campaigns allow reaching multiple contacts via voice calls or chat messages. Use the "run" action to execute a campaign through a specific widget.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete', 'run']).describe('Operation to perform'),
      campaignId: z.string().optional().describe('Campaign ID (required for update/delete)'),
      widgetId: z
        .string()
        .optional()
        .describe('Widget ID to run the campaign through (required for run)'),
      name: z.string().optional().describe('Campaign name'),
      contactIds: z
        .array(z.string())
        .optional()
        .describe('List of contact IDs to include in the campaign'),
      promptVariables: z
        .record(z.string(), z.string())
        .optional()
        .describe('Dynamic prompt variables for personalization')
    })
  )
  .output(
    z.object({
      campaignId: z.string().optional(),
      name: z.string().optional(),
      deleted: z.boolean().optional(),
      running: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      let result = await client.createCampaign({
        name: ctx.input.name,
        contact_ids: ctx.input.contactIds,
        prompt_dynamic_variables: ctx.input.promptVariables
      });
      let data = result.data || result;
      return {
        output: {
          campaignId: data.id,
          name: data.name
        },
        message: `Created campaign **${data.name || data.id}**.`
      };
    }

    if (ctx.input.action === 'update') {
      let result = await client.updateCampaign(ctx.input.campaignId!, {
        name: ctx.input.name,
        contact_ids: ctx.input.contactIds,
        prompt_dynamic_variables: ctx.input.promptVariables
      });
      let data = result.data || result;
      return {
        output: {
          campaignId: data.id,
          name: data.name
        },
        message: `Updated campaign **${data.name || ctx.input.campaignId}**.`
      };
    }

    if (ctx.input.action === 'run') {
      let result = await client.runCampaign(ctx.input.widgetId!, {
        campaign_id: ctx.input.campaignId,
        prompt_dynamic_variables: ctx.input.promptVariables
      });
      let data = result.data || result;
      return {
        output: {
          campaignId: ctx.input.campaignId || data.id,
          running: true
        },
        message: `Started campaign via widget \`${ctx.input.widgetId}\`.`
      };
    }

    // delete
    await client.deleteCampaign(ctx.input.campaignId!);
    return {
      output: {
        campaignId: ctx.input.campaignId,
        deleted: true
      },
      message: `Deleted campaign \`${ctx.input.campaignId}\`.`
    };
  })
  .build();
