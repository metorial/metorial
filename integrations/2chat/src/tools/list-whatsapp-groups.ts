import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwoChatClient } from '../lib/client';
import { spec } from '../spec';

let groupSchema = z.object({
  groupUuid: z.string().optional().describe('UUID of the group'),
  groupName: z.string().optional().describe('Name of the group'),
  participantCount: z.number().optional().describe('Number of participants in the group'),
  createdAt: z.string().optional().describe('When the group was created')
});

let participantSchema = z.object({
  phoneNumber: z.string().optional().describe('Phone number of the participant'),
  isAdmin: z.boolean().optional().describe('Whether the participant is a group admin'),
  displayName: z.string().optional().describe('Display name of the participant')
});

export let listWhatsAppGroups = SlateTool.create(spec, {
  name: 'List WhatsApp Groups',
  key: 'list_whatsapp_groups',
  description: `List all WhatsApp groups for a connected number, or get the participants of a specific group.`,
  instructions: [
    'Provide only the "fromNumber" to list all groups.',
    'Additionally provide a "groupUuid" to get participants of a specific group.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      fromNumber: z.string().describe('Your connected WhatsApp number (with country code)'),
      groupUuid: z
        .string()
        .optional()
        .describe('UUID of a specific group to get participants for')
    })
  )
  .output(
    z.object({
      groups: z
        .array(groupSchema)
        .optional()
        .describe('List of WhatsApp groups (when listing all groups)'),
      participants: z
        .array(participantSchema)
        .optional()
        .describe('List of group participants (when getting a specific group)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwoChatClient({ token: ctx.auth.token });

    if (ctx.input.groupUuid) {
      let result = await client.listGroupParticipants(
        ctx.input.fromNumber,
        ctx.input.groupUuid
      );
      let participants = (result.data?.participants ?? result.participants ?? []).map(
        (p: any) => ({
          phoneNumber: p.phone_number || p.number,
          isAdmin:
            typeof p.wa_is_admin === 'boolean' || typeof p.wa_is_super_admin === 'boolean'
              ? p.wa_is_admin === true || p.wa_is_super_admin === true
              : (p.is_admin ?? p.admin ?? undefined),
          displayName: p.wa_pushname ?? p.display_name ?? p.name ?? undefined
        })
      );

      return {
        output: { participants },
        message: `Found **${participants.length}** participant(s) in the group.`
      };
    }

    let result = await client.listGroups(ctx.input.fromNumber);
    let groups = (result.groups || result.data || []).map((g: any) => ({
      groupUuid: g.uuid || g.group_uuid,
      groupName: g.wa_group_name ?? g.name ?? g.group_name ?? undefined,
      participantCount: g.participant_count ?? g.size ?? undefined,
      createdAt: g.wa_created_at ?? g.created_at ?? undefined
    }));

    return {
      output: { groups },
      message: `Found **${groups.length}** WhatsApp group(s).`
    };
  })
  .build();
