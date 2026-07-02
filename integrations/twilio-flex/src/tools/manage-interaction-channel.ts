import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlexClient } from '../lib/client';
import { spec } from '../spec';

export let manageInteractionChannelTool = SlateTool.create(spec, {
  name: 'Manage Interaction Channel',
  key: 'manage_interaction_channel',
  description: `Get details or update the status of a channel within a Flex interaction. Use this to close a channel, fetch channel status, or list all channels for an interaction.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['get', 'list', 'close']).describe('Action to perform on the channel'),
      interactionSid: z.string().describe('Interaction SID'),
      channelSid: z.string().optional().describe('Channel SID (required for get/close)')
    })
  )
  .output(
    z.object({
      channels: z
        .array(
          z.object({
            channelSid: z.string().describe('Channel SID'),
            interactionSid: z.string().optional().describe('Interaction SID'),
            type: z.string().optional().describe('Channel type'),
            status: z.string().optional().describe('Channel status')
          })
        )
        .describe('Channel details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlexClient(ctx.auth.token);

    if (ctx.input.action === 'list') {
      let result = await client.listInteractionChannels(ctx.input.interactionSid);
      let channels = (result.channels || []).map((c: any) => ({
        channelSid: c.sid,
        interactionSid: c.interaction_sid,
        type: c.type,
        status: c.status
      }));
      return {
        output: { channels },
        message: `Found **${channels.length}** channels for interaction **${ctx.input.interactionSid}**.`
      };
    }

    if (!ctx.input.channelSid) {
      throw new Error('channelSid is required for get/close actions');
    }

    if (ctx.input.action === 'close') {
      let result = await client.updateInteractionChannel(
        ctx.input.interactionSid,
        ctx.input.channelSid,
        { Status: 'closed' }
      );
      return {
        output: {
          channels: [
            {
              channelSid: result.sid,
              interactionSid: result.interaction_sid,
              type: result.type,
              status: result.status
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
            status: result.status
          }
        ]
      },
      message: `Channel **${result.sid}** is **${result.status}** (type: ${result.type}).`
    };
  })
  .build();
