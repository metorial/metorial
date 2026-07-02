import { SlateTool } from 'slates';
import { z } from 'zod';
import { klaviyoServiceError } from '../lib/errors';
import { createClient, extractPaginationCursor } from '../lib/helpers';
import { spec } from '../spec';

export let manageCampaigns = SlateTool.create(spec, {
  name: 'Manage Campaigns',
  key: 'manage_campaigns',
  description: `Create, retrieve, update, delete, or send email/SMS/push campaigns in Klaviyo.
Campaigns target lists and/or segments with marketing messages. Use this to manage the full campaign lifecycle.`,
  instructions: [
    'To create a campaign, provide at minimum a name and channel (email, sms, or push).',
    'Sending a campaign requires the campaign to be in "draft" status with a configured message and audience.',
    'Use the filter parameter with Klaviyo syntax to search campaigns, e.g. `equals(messages.channel,"email")`.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete', 'send'])
        .describe('Action to perform'),
      campaignId: z
        .string()
        .optional()
        .describe('Campaign ID (required for get, update, delete, send)'),
      name: z.string().optional().describe('Campaign name'),
      channel: z
        .enum(['email', 'sms', 'push'])
        .optional()
        .describe('Message channel (required for create)'),
      audiences: z
        .object({
          included: z.array(z.string()).optional().describe('List/segment IDs to include'),
          excluded: z.array(z.string()).optional().describe('List/segment IDs to exclude')
        })
        .optional()
        .describe('Target audience configuration'),
      sendOptions: z
        .object({
          sendAt: z.string().optional().describe('Scheduled send time (ISO 8601)'),
          useSmartSendTime: z.boolean().optional().describe('Use smart send time optimization')
        })
        .optional()
        .describe('Send scheduling options'),
      filter: z.string().optional().describe('Filter for listing campaigns'),
      sort: z.string().optional().describe('Sort field for listing'),
      pageCursor: z.string().optional().describe('Pagination cursor'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      campaigns: z
        .array(
          z.object({
            campaignId: z.string().describe('Campaign ID'),
            name: z.string().optional().describe('Campaign name'),
            status: z.string().optional().describe('Campaign status'),
            channel: z.string().optional().describe('Message channel'),
            audiences: z.any().optional().describe('Audience configuration'),
            sendTime: z.string().optional().describe('Scheduled send time'),
            created: z.string().optional().describe('Creation timestamp'),
            updated: z.string().optional().describe('Last updated timestamp'),
            archived: z.boolean().optional().describe('Whether the campaign is archived')
          })
        )
        .optional()
        .describe('Campaign results'),
      campaignId: z
        .string()
        .optional()
        .describe('ID of the created/updated/targeted campaign'),
      success: z.boolean().describe('Whether the operation succeeded'),
      nextCursor: z.string().optional().describe('Pagination cursor for next page'),
      hasMore: z.boolean().optional().describe('Whether more results exist')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let {
      action,
      campaignId,
      name,
      channel,
      audiences,
      sendOptions,
      filter,
      sort,
      pageCursor,
      pageSize
    } = ctx.input;

    if (action === 'list') {
      let result = await client.getCampaigns({ filter, sort, pageCursor, pageSize });
      let campaigns = result.data.map(c => ({
        campaignId: c.id ?? '',
        name: c.attributes?.name ?? undefined,
        status: c.attributes?.status ?? undefined,
        channel: c.attributes?.channel ?? undefined,
        audiences: c.attributes?.audiences ?? undefined,
        sendTime: c.attributes?.send_time ?? undefined,
        created: c.attributes?.created_at ?? undefined,
        updated: c.attributes?.updated_at ?? undefined,
        archived: c.attributes?.archived ?? undefined
      }));
      let nextCursor = extractPaginationCursor(result.links);
      return {
        output: { campaigns, success: true, nextCursor, hasMore: !!nextCursor },
        message: `Retrieved **${campaigns.length}** campaigns`
      };
    }

    if (action === 'get') {
      if (!campaignId) throw klaviyoServiceError('campaignId is required');
      let result = await client.getCampaign(campaignId);
      let c = Array.isArray(result.data) ? result.data[0] : result.data;
      return {
        output: {
          campaigns: [
            {
              campaignId: c?.id ?? '',
              name: c?.attributes?.name,
              status: c?.attributes?.status,
              channel: c?.attributes?.channel,
              audiences: c?.attributes?.audiences,
              sendTime: c?.attributes?.send_time,
              created: c?.attributes?.created_at,
              updated: c?.attributes?.updated_at,
              archived: c?.attributes?.archived
            }
          ],
          campaignId: c?.id,
          success: true
        },
        message: `Retrieved campaign **${c?.attributes?.name ?? campaignId}**`
      };
    }

    if (action === 'create') {
      if (!name) throw klaviyoServiceError('name is required for create');
      let attributes: Record<string, any> = { name };
      if (channel) attributes.channel = channel;
      if (audiences) {
        attributes.audiences = {
          included: audiences.included?.map(id => ({ id })) ?? [],
          excluded: audiences.excluded?.map(id => ({ id })) ?? []
        };
      }
      if (sendOptions?.sendAt) attributes.send_time = sendOptions.sendAt;
      if (sendOptions?.useSmartSendTime !== undefined)
        attributes.smart_send_time = sendOptions.useSmartSendTime;

      let result = await client.createCampaign(attributes);
      let c = Array.isArray(result.data) ? result.data[0] : result.data;
      return {
        output: { campaignId: c?.id, success: true },
        message: `Created campaign **${name}** (${c?.id})`
      };
    }

    if (action === 'update') {
      if (!campaignId) throw klaviyoServiceError('campaignId is required');
      let attributes: Record<string, any> = {};
      if (name) attributes.name = name;
      if (audiences) {
        attributes.audiences = {
          included: audiences.included?.map(id => ({ id })) ?? [],
          excluded: audiences.excluded?.map(id => ({ id })) ?? []
        };
      }
      if (sendOptions?.sendAt) attributes.send_time = sendOptions.sendAt;

      await client.updateCampaign(campaignId, attributes);
      return {
        output: { campaignId, success: true },
        message: `Updated campaign **${campaignId}**`
      };
    }

    if (action === 'delete') {
      if (!campaignId) throw klaviyoServiceError('campaignId is required');
      await client.deleteCampaign(campaignId);
      return {
        output: { campaignId, success: true },
        message: `Deleted campaign **${campaignId}**`
      };
    }

    if (action === 'send') {
      if (!campaignId) throw klaviyoServiceError('campaignId is required');
      await client.sendCampaign(campaignId);
      return {
        output: { campaignId, success: true },
        message: `Sent campaign **${campaignId}**`
      };
    }

    throw klaviyoServiceError(`Unknown action: ${action}`);
  })
  .build();
