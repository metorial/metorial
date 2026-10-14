import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, getListResult, getObjectResult } from '../lib/client';
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
      startTime: z
        .string()
        .optional()
        .describe('Scheduled start timestamp in ISO 8601 format, required for create'),
      interval: z
        .number()
        .optional()
        .describe('Provider scheduling interval as a whole number, required for create'),
      timeZone: z.string().optional().describe('IANA scheduling time zone, such as UTC'),
      enabled: z.boolean().optional().describe('Enable scheduled campaign execution'),
      attributes: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Additional provider campaign configuration'),
      message: z.string().optional().describe('Message text for a chat campaign run'),
      startNewConversation: z
        .boolean()
        .optional()
        .describe('Start new conversations when running a chat campaign'),
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

    if (ctx.input.interval !== undefined && !Number.isInteger(ctx.input.interval)) {
      throw createApiServiceError('interval must be a whole number.');
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name || !ctx.input.startTime || ctx.input.interval === undefined) {
        throw createApiServiceError(
          'name, startTime, and interval are required to create a scheduled campaign.'
        );
      }
      let result = await client.createCampaign({
        name: ctx.input.name,
        type: 'outbound_call',
        widget_id: ctx.input.widgetId,
        start_time: ctx.input.startTime,
        interval: ctx.input.interval,
        time_zone: ctx.input.timeZone,
        enabled: ctx.input.enabled,
        attributes: ctx.input.attributes,
        contact_ids: ctx.input.contactIds,
        prompt_dynamic_variables: ctx.input.promptVariables
      });
      let data = getObjectResult(result);
      if (ctx.input.contactIds !== undefined) {
        await client.updateCampaignContacts(data.id, ctx.input.contactIds);
      }
      return {
        output: {
          campaignId: data.id ?? ctx.input.campaignId,
          name: data.name ?? undefined
        },
        message: `Created campaign **${data.name || data.id}**.`
      };
    }

    if (ctx.input.action === 'update') {
      let result = await client.updateCampaign(ctx.input.campaignId!, {
        name: ctx.input.name,
        widget_id: ctx.input.widgetId,
        start_time: ctx.input.startTime,
        interval: ctx.input.interval,
        time_zone: ctx.input.timeZone,
        enabled: ctx.input.enabled,
        attributes: ctx.input.attributes,
        contact_ids: ctx.input.contactIds,
        prompt_dynamic_variables: ctx.input.promptVariables
      });
      let data = getObjectResult(result);
      if (ctx.input.contactIds !== undefined) {
        await client.updateCampaignContacts(ctx.input.campaignId!, ctx.input.contactIds);
      }
      return {
        output: {
          campaignId: data.id ?? ctx.input.campaignId,
          name: data.name ?? undefined
        },
        message: `Updated campaign **${data.name || ctx.input.campaignId}**.`
      };
    }

    if (ctx.input.action === 'run') {
      let contactIds = ctx.input.contactIds;
      if (contactIds === undefined && ctx.input.campaignId) {
        contactIds = [];
        let page: number | null | undefined = 1;
        while (page) {
          let result = getListResult(
            await client.listCampaignContacts(ctx.input.campaignId, { page, size: 100 })
          );
          contactIds.push(...result.items.map(contact => contact.id ?? contact.contact_id));
          if (result.nextPage && result.nextPage <= page) {
            throw createApiServiceError(
              'Insighto.ai returned inconsistent campaign-contact pagination.'
            );
          }
          page = result.nextPage;
        }
      }
      if (!contactIds?.length || contactIds.some(id => !id?.trim())) {
        throw createApiServiceError(
          'Provide at least one contact ID, or a campaignId with linked contacts, to run a campaign.'
        );
      }
      let result = await client.runCampaign(ctx.input.widgetId!, {
        contact_ids: contactIds,
        message: ctx.input.message,
        start_new_conversation: ctx.input.startNewConversation,
        campaign_id: ctx.input.campaignId,
        prompt_dynamic_variables: ctx.input.promptVariables
      });
      let data = result?.data ?? result ?? {};
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
