import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwoChatClient } from '../lib/client';
import { spec } from '../spec';

export let manageWhatsAppGroup = SlateTool.create(spec, {
  name: 'Manage WhatsApp Group',
  key: 'manage_whatsapp_group',
  description: `Create a WhatsApp group or manage group membership and settings. Supports creating groups, adding/removing participants, promoting/demoting admins, and updating group descriptions.`,
  instructions: [
    'Use action "create" to create a new group with initial participants.',
    'Use action "add_participant" or "remove_participant" to manage membership.',
    'Use action "promote" or "demote" to change admin privileges.',
    'Use action "set_description" to update the group description.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'create',
          'add_participant',
          'remove_participant',
          'promote',
          'demote',
          'set_description'
        ])
        .describe('Action to perform on the group'),
      fromNumber: z.string().describe('Your connected WhatsApp number (with country code)'),
      groupUuid: z
        .string()
        .optional()
        .describe('UUID of the group (required for all actions except "create")'),
      groupName: z
        .string()
        .optional()
        .describe('Name for the new group (required for "create")'),
      participants: z
        .array(z.string())
        .optional()
        .describe('Phone numbers of initial participants (for "create")'),
      participantNumber: z
        .string()
        .optional()
        .describe('Phone number of the participant to add/remove/promote/demote'),
      description: z
        .string()
        .optional()
        .describe('New group description (for "set_description")')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was performed successfully'),
      groupUuid: z.string().optional().describe('UUID of the group'),
      groupName: z.string().optional().describe('Name of the group')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwoChatClient({ token: ctx.auth.token });
    let {
      action,
      fromNumber,
      groupUuid,
      groupName,
      participants,
      participantNumber,
      description
    } = ctx.input;

    let result: any;
    let message: string;

    switch (action) {
      case 'create': {
        result = await client.createGroup({
          fromNumber,
          groupName: groupName || 'New Group',
          participants: participants || []
        });
        message = `Created group **${groupName}** with ${participants?.length || 0} participant(s).`;
        break;
      }
      case 'add_participant': {
        result = await client.addGroupParticipant({
          fromNumber,
          groupUuid: groupUuid!,
          phoneNumber: participantNumber!
        });
        message = `Added **${participantNumber}** to the group.`;
        break;
      }
      case 'remove_participant': {
        result = await client.removeGroupParticipant({
          fromNumber,
          groupUuid: groupUuid!,
          phoneNumber: participantNumber!
        });
        message = `Removed **${participantNumber}** from the group.`;
        break;
      }
      case 'promote': {
        result = await client.promoteGroupParticipant({
          fromNumber,
          groupUuid: groupUuid!,
          phoneNumber: participantNumber!
        });
        message = `Promoted **${participantNumber}** to admin.`;
        break;
      }
      case 'demote': {
        result = await client.demoteGroupParticipant({
          fromNumber,
          groupUuid: groupUuid!,
          phoneNumber: participantNumber!
        });
        message = `Demoted **${participantNumber}** from admin.`;
        break;
      }
      case 'set_description': {
        result = await client.setGroupDescription({
          fromNumber,
          groupUuid: groupUuid!,
          description: description || ''
        });
        message = `Updated group description.`;
        break;
      }
    }

    return {
      output: {
        success: result?.success ?? true,
        groupUuid: result?.uuid || result?.group_uuid || groupUuid,
        groupName: result?.group_name || result?.name || groupName
      },
      message
    };
  })
  .build();
