import { SlateTool } from 'slates';
import { z } from 'zod';
import { MeetClient } from '../lib/client';
import { googleMeetActionScopes } from '../scopes';
import { spec } from '../spec';

export let getSpaceTool = SlateTool.create(spec, {
  name: 'Get Meeting Space',
  key: 'get_space',
  description: `Retrieve details about a Google Meet meeting space by its resource name or meeting code. Returns the space configuration, meeting URI, and active conference information.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(googleMeetActionScopes.getSpace)
  .input(
    z.object({
      spaceNameOrCode: z
        .string()
        .describe(
          'Space resource name (e.g., "spaces/abc123") or meeting code (e.g., "abc-mnop-xyz")'
        )
    })
  )
  .output(
    z.object({
      spaceName: z.string().describe('Resource name of the space'),
      meetingUri: z.string().describe('Full meeting URL'),
      meetingCode: z.string().describe('Human-readable meeting code'),
      accessType: z.string().optional().describe('Who can join without knocking'),
      entryPointAccess: z.string().optional().describe('Allowed entry points'),
      moderation: z.string().optional().describe('Moderation mode'),
      activeConferenceRecord: z
        .string()
        .optional()
        .describe('Resource name of active conference, if any')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MeetClient({ token: ctx.auth.token });
    let space = await client.getSpace(ctx.input.spaceNameOrCode);

    return {
      output: {
        spaceName: space.name || '',
        meetingUri: space.meetingUri || '',
        meetingCode: space.meetingCode || '',
        accessType: space.config?.accessType,
        entryPointAccess: space.config?.entryPointAccess,
        moderation: space.config?.moderation,
        activeConferenceRecord: space.activeConference?.conferenceRecord
      },
      message: `Retrieved space **${space.meetingCode}**${space.activeConference?.conferenceRecord ? ' (active conference in progress)' : ''}.`
    };
  })
  .build();
