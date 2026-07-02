import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { spec } from '../spec';

export let listChannels = SlateTool.create(spec, {
  name: 'List Channels',
  key: 'list_channels',
  description: `List all channels in a Microsoft Team. Returns channel names, descriptions, types (standard, private, shared), and membership type.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.string().describe('ID of the team to list channels for')
    })
  )
  .output(
    z.object({
      channels: z.array(
        z.object({
          channelId: z.string().describe('Unique identifier of the channel'),
          displayName: z.string().describe('Display name of the channel'),
          description: z.string().nullable().describe('Description of the channel'),
          membershipType: z
            .string()
            .optional()
            .describe('Channel type: standard, private, or shared'),
          webUrl: z.string().optional().describe('URL to open the channel in Teams')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphClient({ token: ctx.auth.token });
    let channels = await client.listChannels(ctx.input.teamId);

    let mapped = channels.map((c: any) => ({
      channelId: c.id,
      displayName: c.displayName,
      description: c.description,
      membershipType: c.membershipType,
      webUrl: c.webUrl
    }));

    return {
      output: { channels: mapped },
      message: `Found **${mapped.length}** channels in the team.`
    };
  })
  .build();
