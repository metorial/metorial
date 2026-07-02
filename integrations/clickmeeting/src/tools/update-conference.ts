import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateConference = SlateTool.create(spec, {
  name: 'Update Conference',
  key: 'update_conference',
  description: `Updates an existing conference room's configuration, including name, access type, schedule, lobby settings, registration, and more. Only provide fields that need to change.`,
  instructions: [
    'Only include the fields you want to update. Omitted fields remain unchanged.'
  ]
})
  .input(
    z.object({
      roomId: z.string().describe('ID of the conference room to update'),
      name: z.string().optional().describe('New room name'),
      roomType: z.enum(['meeting', 'webinar']).optional().describe('Type of room'),
      permanentRoom: z
        .boolean()
        .optional()
        .describe('True for permanent, false for time-scheduled'),
      accessType: z.number().min(1).max(3).optional().describe('1=open, 2=password, 3=token'),
      password: z.string().optional().describe('Password for access_type=2'),
      startsAt: z.string().optional().describe('Start time in ISO 8601 format'),
      duration: z.string().optional().describe('Duration of the meeting'),
      timezone: z.string().optional().describe('Timezone identifier'),
      lobbyEnabled: z.boolean().optional().describe('Enable/disable lobby'),
      lobbyDescription: z.string().optional().describe('Lobby description text'),
      registrationEnabled: z.boolean().optional().describe('Enable/disable registration'),
      customRoomUrlName: z.string().optional().describe('Custom URL slug for the room'),
      recorderAutostart: z.boolean().optional().describe('Auto-start recording'),
      settings: z
        .object({
          showOnPersonalPage: z.boolean().optional(),
          thankYouEmailsEnabled: z.boolean().optional(),
          connectionTesterEnabled: z.boolean().optional()
        })
        .optional()
        .describe('Additional room settings')
    })
  )
  .output(
    z.object({
      conference: z.record(z.string(), z.unknown()).describe('Updated conference room details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { input } = ctx;

    let params: Record<string, unknown> = {};

    if (input.name !== undefined) params.name = input.name;
    if (input.roomType !== undefined) params.room_type = input.roomType;
    if (input.permanentRoom !== undefined) params.permanent_room = input.permanentRoom ? 1 : 0;
    if (input.accessType !== undefined) params.access_type = input.accessType;
    if (input.password !== undefined) params.password = input.password;
    if (input.startsAt !== undefined) params.starts_at = input.startsAt;
    if (input.duration !== undefined) params.duration = input.duration;
    if (input.timezone !== undefined) params.timezone = input.timezone;
    if (input.lobbyEnabled !== undefined)
      params.lobby_enabled = input.lobbyEnabled ? '1' : '0';
    if (input.lobbyDescription !== undefined)
      params.lobby_description = input.lobbyDescription;
    if (input.registrationEnabled !== undefined)
      params.registration_enabled = input.registrationEnabled ? 1 : 0;
    if (input.customRoomUrlName !== undefined)
      params.custom_room_url_name = input.customRoomUrlName;
    if (input.recorderAutostart !== undefined)
      params.recorder_autostart = input.recorderAutostart ? 1 : 0;

    if (input.settings) {
      let settings: Record<string, unknown> = {};
      if (input.settings.showOnPersonalPage !== undefined)
        settings.show_on_personal_page = input.settings.showOnPersonalPage;
      if (input.settings.thankYouEmailsEnabled !== undefined)
        settings.thank_you_emails_enabled = input.settings.thankYouEmailsEnabled;
      if (input.settings.connectionTesterEnabled !== undefined)
        settings.connection_tester_enabled = input.settings.connectionTesterEnabled;
      params.settings = settings;
    }

    let conference = await client.updateConference(input.roomId, params);

    return {
      output: { conference },
      message: `Updated conference **${conference?.name || input.roomId}**.`
    };
  })
  .build();
