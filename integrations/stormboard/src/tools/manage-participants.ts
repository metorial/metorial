import { SlateTool } from 'slates';
import { z } from 'zod';
import { StormboardClient } from '../lib/client';
import { spec } from '../spec';

export let manageParticipants = SlateTool.create(spec, {
  name: 'Manage Participants',
  key: 'manage_participants',
  description: `Manage Storm participants and invitations. List current participants, invite new people by email, accept or decline invitations, join a Storm with an access key, or check your access level.`
})
  .input(
    z.object({
      stormId: z.string().describe('ID of the Storm'),
      action: z
        .enum(['list', 'invite', 'accept', 'decline', 'join', 'check_access'])
        .describe('Action to perform'),
      email: z.string().optional().describe('Email address to invite (required for invite)'),
      accessKey: z
        .string()
        .optional()
        .describe('Access key to join a Storm (required for join)')
    })
  )
  .output(
    z.object({
      participants: z.array(z.any()).optional().describe('List of participants'),
      accessLevel: z.any().optional().describe('User access level details'),
      success: z.boolean().describe('Whether the action was successful'),
      result: z.any().optional().describe('Response data from the action')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StormboardClient({ token: ctx.auth.token });
    let { stormId, action, email, accessKey } = ctx.input;

    if (action === 'list') {
      let participants = await client.listParticipants(stormId);
      let list = Array.isArray(participants) ? participants : [];
      return {
        output: { participants: list, success: true },
        message: `Found **${list.length}** participant(s) in Storm ${stormId}.`
      };
    }

    if (action === 'invite') {
      if (!email) {
        throw new Error('email is required for inviting a participant');
      }
      let result = await client.inviteParticipant(stormId, { email });
      return {
        output: { result, success: true },
        message: `Invited **${email}** to Storm ${stormId}.`
      };
    }

    if (action === 'accept') {
      let result = await client.acceptInvite(stormId);
      return {
        output: { result, success: true },
        message: `Accepted invitation to Storm ${stormId}.`
      };
    }

    if (action === 'decline') {
      let result = await client.declineInvite(stormId);
      return {
        output: { result, success: true },
        message: `Declined invitation to Storm ${stormId}.`
      };
    }

    if (action === 'join') {
      if (!accessKey) {
        throw new Error('accessKey is required for joining a Storm');
      }
      let result = await client.joinStorm(stormId, accessKey);
      return {
        output: { result, success: true },
        message: `Joined Storm ${stormId}.`
      };
    }

    if (action === 'check_access') {
      let accessLevel = await client.getStormAccess(stormId);
      return {
        output: { accessLevel, success: true },
        message: `Retrieved access level for Storm ${stormId}.`
      };
    }

    return {
      output: { success: false },
      message: 'Unknown action.'
    };
  })
  .build();
