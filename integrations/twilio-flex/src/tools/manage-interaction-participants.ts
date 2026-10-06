import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlexClient } from '../lib/client';
import { fail, validateInput } from '../lib/validation';
import { spec } from '../spec';

export let manageInteractionParticipantsTool = SlateTool.create(spec, {
  name: 'Manage Interaction Participants',
  key: 'manage_interaction_participants',
  description: `Add, remove, or list participants in a Flex interaction channel. Add requires the native Type and MediaProperties payload, with optional RoutingProperties. Closing a participant changes its task/reservation state and retains history; it does not delete the interaction.`,
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
      action: z.enum(['add', 'remove', 'list']).describe('Action to perform'),
      interactionSid: z.string().describe('Interaction SID'),
      channelSid: z.string().describe('Channel SID within the interaction'),
      participantSid: z.string().optional().describe('Participant SID (required for remove)'),
      participantType: z
        .enum(['agent', 'customer', 'external', 'supervisor', 'unknown'])
        .optional()
        .describe('Type of participant to add'),
      mediaProperties: z
        .record(z.string(), z.string())
        .optional()
        .describe('Media properties for the participant (e.g., {"from": "+1234567890"})'),
      routingAttributes: z
        .record(z.string(), z.string())
        .optional()
        .describe('Routing attributes for agent participants')
    })
  )
  .output(
    z.object({
      nextPageToken: z
        .string()
        .optional()
        .describe('Native continuation; omitted when this page is exhausted.'),
      hasMore: z.boolean().optional().describe('Whether a next page is available.'),
      participants: z
        .array(
          z.object({
            participantSid: z.string().describe('Participant SID'),
            type: z.string().optional().describe('Participant type'),
            interactionSid: z.string().optional().describe('Interaction SID'),
            channelSid: z.string().optional().describe('Channel SID')
          })
        )
        .describe('List of participants')
    })
  )
  .handleInvocation(async ctx => {
    validateInput('manage_interaction_participants', ctx.input);
    let client = new FlexClient(ctx.auth.token, ctx.auth.accountSid, ctx.input.pageToken);

    if (ctx.input.action === 'list') {
      let result = await client.listInteractionChannelParticipants(
        ctx.input.interactionSid,
        ctx.input.channelSid
      );
      let participants = (result.participants || []).map((p: any) => ({
        participantSid: p.sid,
        type: p.type,
        interactionSid: p.interaction_sid,
        channelSid: p.channel_sid
      }));
      return {
        output: { participants, nextPageToken: result.nextPageToken, hasMore: result.hasMore },
        message: `Found **${participants.length}** participants in interaction channel.`
      };
    }

    if (ctx.input.action === 'add') {
      let params: Record<string, string | undefined> = {
        Type: ctx.input.participantType || 'agent'
      };
      if (ctx.input.mediaProperties !== undefined) {
        params.MediaProperties = JSON.stringify(ctx.input.mediaProperties);
      }
      if (ctx.input.routingAttributes !== undefined) {
        params.RoutingProperties = JSON.stringify(ctx.input.routingAttributes);
      }

      let result = await client.createInteractionChannelParticipant(
        ctx.input.interactionSid,
        ctx.input.channelSid,
        params
      );
      return {
        output: {
          participants: [
            {
              participantSid: result.sid,
              type: result.type,
              interactionSid: result.interaction_sid,
              channelSid: result.channel_sid
            }
          ]
        },
        message: `Added **${result.type}** participant **${result.sid}** to interaction channel.`
      };
    }

    // Remove
    if (!ctx.input.participantSid) {
      throw fail('participantSid is required when removing a participant');
    }
    await client.updateInteractionChannelParticipant(
      ctx.input.interactionSid,
      ctx.input.channelSid,
      ctx.input.participantSid,
      { Status: 'closed' }
    );
    return {
      output: {
        participants: [
          {
            participantSid: ctx.input.participantSid,
            type: ctx.input.participantType,
            interactionSid: ctx.input.interactionSid,
            channelSid: ctx.input.channelSid
          }
        ]
      },
      message: `Closed participant **${ctx.input.participantSid}** in the interaction channel; history and downstream effects remain.`
    };
  })
  .build();
