import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebexClient } from '../lib/client';
import { spec } from '../spec';

export let listMemberships = SlateTool.create(spec, {
  name: 'List Members',
  key: 'list_memberships',
  description: `List members of a Webex space. Filter by room, person ID, or email. Returns membership details including moderator status and display names.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      nextPageUrl: z
        .string()
        .optional()
        .describe(
          'Native next-page URL returned by this tool. Use alone; do not add filters.'
        ),
      roomId: z.string().optional().describe('ID of the space to list members for'),
      personId: z.string().optional().describe('Filter by person ID (requires roomId)'),
      personEmail: z.string().optional().describe('Filter by email (requires roomId)'),
      max: z
        .number()
        .optional()
        .describe('Maximum number of memberships to return (default 100)')
    })
  )
  .output(
    z.object({
      nextPageUrl: z.string().optional().describe('URL for the next native page, if present'),
      memberships: z
        .array(
          z.object({
            membershipId: z.string().describe('Unique ID of the membership'),
            roomId: z.string().optional().describe('ID of the space'),
            personId: z.string().optional().describe('ID of the person'),
            personEmail: z.string().optional().describe('Email of the person'),
            personDisplayName: z.string().optional().describe('Display name of the person'),
            personOrgId: z.string().optional().describe('Organization ID of the person'),
            isModerator: z.boolean().optional().describe('Whether the person is a moderator'),
            roomType: z.string().optional().describe('Type of room (direct or group)'),
            created: z.string().optional().describe('Membership creation timestamp')
          })
        )
        .describe('List of memberships')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebexClient({ token: ctx.auth.token });

    let result = await client.listMemberships({
      roomId: ctx.input.roomId,
      personId: ctx.input.personId,
      personEmail: ctx.input.personEmail,
      max: ctx.input.max,
      nextPageUrl: ctx.input.nextPageUrl
    });

    let items = result.items || [];
    let memberships = items.map(m => ({
      membershipId: m.id,
      roomId: m.roomId,
      personId: m.personId,
      personEmail: m.personEmail,
      personDisplayName: m.personDisplayName,
      personOrgId: m.personOrgId,
      isModerator: m.isModerator,
      roomType: m.roomType,
      created: m.created
    }));

    return {
      output: { memberships, nextPageUrl: result.nextPageUrl },
      message: `Found **${memberships.length}** member(s).`
    };
  })
  .build();
