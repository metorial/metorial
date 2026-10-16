import { createApiServiceError, SlateTool } from 'slates';
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
      registrationTemplate: z
        .number()
        .optional()
        .describe('Registration template number, from 1 to 3'),
      status: z.enum(['active', 'inactive']).optional().describe('Room availability status'),
      customRoomUrlName: z.string().optional().describe('Custom URL slug for the room'),
      recorderAutostart: z.boolean().optional().describe('Auto-start recording'),
      settings: z
        .object({
          showOnPersonalPage: z.boolean().optional(),
          thankYouEmailsEnabled: z.boolean().optional(),
          connectionTesterEnabled: z.boolean().optional(),
          phoneGatewayEnabled: z.boolean().optional(),
          roomInviteButtonEnabled: z.boolean().optional(),
          socialMediaSharingEnabled: z.boolean().optional(),
          connectionStatusEnabled: z.boolean().optional(),
          thankYouPageUrl: z.string().optional()
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
    if (input.accessType !== undefined && !Number.isInteger(input.accessType)) {
      throw createApiServiceError('accessType must be an integer: 1, 2, or 3.');
    }
    if (
      input.registrationTemplate !== undefined &&
      (!Number.isInteger(input.registrationTemplate) ||
        input.registrationTemplate < 1 ||
        input.registrationTemplate > 3)
    ) {
      throw createApiServiceError('registrationTemplate must be an integer from 1 to 3.');
    }

    if (
      (input.startsAt !== undefined || input.duration !== undefined) &&
      input.permanentRoom === undefined
    ) {
      throw createApiServiceError('Include permanentRoom when changing startsAt or duration.');
    }

    let params: Record<string, unknown> = {};
    if (input.status !== undefined) params.status = input.status;

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
    if (input.registrationEnabled !== undefined || input.registrationTemplate !== undefined) {
      params.registration = {
        ...(input.registrationEnabled !== undefined
          ? { enabled: input.registrationEnabled }
          : {}),
        ...(input.registrationTemplate !== undefined
          ? { template: input.registrationTemplate }
          : {})
      };
    }
    if (input.customRoomUrlName !== undefined)
      params.custom_room_url_name = input.customRoomUrlName;

    if (input.settings || input.recorderAutostart !== undefined) {
      let settings: Record<string, unknown> = {};
      if (input.recorderAutostart !== undefined)
        settings.recorder_autostart_enabled = input.recorderAutostart;
      if (input.settings?.showOnPersonalPage !== undefined)
        settings.show_on_personal_page = input.settings?.showOnPersonalPage;
      if (input.settings?.thankYouEmailsEnabled !== undefined)
        settings.thank_you_emails_enabled = input.settings?.thankYouEmailsEnabled;
      if (input.settings?.connectionTesterEnabled !== undefined)
        settings.connection_tester_enabled = input.settings?.connectionTesterEnabled;
      if (input.settings?.phoneGatewayEnabled !== undefined)
        settings.phonegateway_enabled = input.settings.phoneGatewayEnabled;
      if (input.settings?.roomInviteButtonEnabled !== undefined)
        settings.room_invite_button_enabled = input.settings.roomInviteButtonEnabled;
      if (input.settings?.socialMediaSharingEnabled !== undefined)
        settings.social_media_sharing_enabled = input.settings.socialMediaSharingEnabled;
      if (input.settings?.connectionStatusEnabled !== undefined)
        settings.connection_status_enabled = input.settings.connectionStatusEnabled;
      if (input.settings?.thankYouPageUrl !== undefined)
        settings.thank_you_page_url = input.settings.thankYouPageUrl;
      params.settings = settings;
    }

    let conference = await client.updateConference(input.roomId, params);

    return {
      output: { conference },
      message: `Updated conference **${conference?.name || input.roomId}**.`
    };
  })
  .build();
