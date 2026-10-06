import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlexClient } from '../lib/client';
import { fail, validateInput } from '../lib/validation';
import { spec } from '../spec';

export let manageInteractionChannelTool = SlateTool.create(spec, {
  name: 'Manage Interaction Channel',
  key: 'manage_interaction_channel',
  description: `Get details or update the status of a channel within a Flex interaction. Use this to close a channel, fetch channel status, or list all channels for an interaction.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      pageToken: z
        .string()
        .optional()
        .describe(
          'Opaque continuation from nextPageToken; retain the same resource and filters.'
        ),
      action: z.enum(['get', 'list', 'close']).describe('Action to perform on the channel'),
      interactionSid: z.string().describe('Interaction SID'),
      routingStatus: z
        .literal('closed')
        .optional()
        .describe(
          'With close, also complete the associated tasks; omitted leaves them in wrapup.'
        ),
      channelSid: z.string().optional().describe('Channel SID (required for get/close)')
    })
  )
  .output(
    z.object({
      nextPageToken: z
        .string()
        .optional()
        .describe('Native continuation; omitted when this page is exhausted.'),
      hasMore: z.boolean().optional().describe('Whether a next page is available.'),
      channels: z
        .array(
          z.object({
            channelSid: z.string().describe('Channel SID'),
            interactionSid: z.string().optional().describe('Interaction SID'),
            type: z.string().optional().describe('Channel type'),
            status: z.string().optional().describe('Channel status'),
            errorCode: z
              .number()
              .optional()
              .describe('Native setup failure code when present'),
            errorMessage: z
              .string()
              .optional()
              .describe('Native setup failure message when present')
          })
        )
        .describe('Channel details')
    })
  )
  .handleInvocation(async ctx => {
    validateInput('manage_interaction_channel', ctx.input);
    let client = new FlexClient(ctx.auth.token, ctx.auth.accountSid, ctx.input.pageToken);

    if (ctx.input.action === 'list') {
      let result = await client.listInteractionChannels(ctx.input.interactionSid);
      let channels = (result.channels || []).map((c: any) => ({
        channelSid: c.sid,
        interactionSid: c.interaction_sid,
        type: c.type,
        status: c.status,
        errorCode: c.error_code,
        errorMessage: c.error_message
      }));
      return {
        output: { channels, nextPageToken: result.nextPageToken, hasMore: result.hasMore },
        message: `Found **${channels.length}** channels for interaction **${ctx.input.interactionSid}**.`
      };
    }

    if (!ctx.input.channelSid) {
      throw fail('channelSid is required for get/close actions');
    }

    if (ctx.input.action === 'close') {
      let result = await client.updateInteractionChannel(
        ctx.input.interactionSid,
        ctx.input.channelSid,
        {
          Status: 'closed',
          Routing: ctx.input.routingStatus
            ? JSON.stringify({ status: ctx.input.routingStatus })
            : undefined
        }
      );
      return {
        output: {
          channels: [
            {
              channelSid: result.sid,
              interactionSid: result.interaction_sid,
              type: result.type,
              status: result.status,
              errorCode: result.error_code,
              errorMessage: result.error_message
            }
          ]
        },
        message: `Closed channel **${result.sid}** in interaction **${ctx.input.interactionSid}**.`
      };
    }

    // get
    let result = await client.getInteractionChannel(
      ctx.input.interactionSid,
      ctx.input.channelSid
    );
    return {
      output: {
        channels: [
          {
            channelSid: result.sid,
            interactionSid: result.interaction_sid,
            type: result.type,
            status: result.status,
            errorCode: result.error_code,
            errorMessage: result.error_message
          }
        ]
      },
      message: `Channel **${result.sid}** is **${result.status}** (type: ${result.type}).`
    };
  })
  .build();
