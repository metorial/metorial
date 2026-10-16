import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createConference = SlateTool.create(spec, {
  name: 'Create Conference',
  key: 'create_conference',
  description: `Creates a new conference room (meeting or webinar). Rooms can be time-scheduled or permanent. Configure access type, lobby, timezone, registration, and other settings.`,
  instructions: [
    'For time-scheduled rooms, startsAt and duration are optional; the provider defaults startsAt when omitted.',
    'If accessType is 2 (password), a password is required.',
    'If accessType is 3 (token), generate tokens separately after creation.'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Name of the conference room'),
      roomType: z.enum(['meeting', 'webinar']).describe('Type of room'),
      permanentRoom: z
        .boolean()
        .default(false)
        .describe('True for permanent room, false for time-scheduled'),
      accessType: z
        .number()
        .min(1)
        .max(3)
        .default(1)
        .describe('1=open, 2=password-protected, 3=token-protected'),
      password: z.string().optional().describe('Password for access_type=2'),
      startsAt: z
        .string()
        .optional()
        .describe('Start time in ISO 8601 format (for time-scheduled rooms)'),
      duration: z
        .string()
        .optional()
        .describe('Duration of the meeting (e.g. "1" for 1 hour)'),
      timezone: z
        .string()
        .optional()
        .describe('Timezone identifier (e.g. "America/New_York")'),
      lobbyEnabled: z.boolean().optional().describe('Enable lobby/waiting room'),
      lobbyDescription: z.string().optional().describe('Text displayed in the lobby'),
      registrationEnabled: z.boolean().optional().describe('Require attendee registration'),
      registrationTemplate: z
        .number()
        .optional()
        .describe('Registration template number, from 1 to 3'),
      customRoomUrlName: z.string().optional().describe('Custom URL slug for the room'),
      recorderAutostart: z
        .boolean()
        .optional()
        .describe('Auto-start recording when event begins'),
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
      conference: z.record(z.string(), z.unknown()).describe('Created conference room details')
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

    if (input.accessType === 2 && !input.password) {
      throw createApiServiceError('password is required for password-protected rooms.');
    }

    let params: Record<string, unknown> = {
      name: input.name,
      room_type: input.roomType,
      permanent_room: input.permanentRoom ? 1 : 0,
      access_type: input.accessType
    };

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

    let conference = await client.createConference(params);

    return {
      output: { conference },
      message: `Created ${input.roomType} **${input.name}**.`
    };
  })
  .build();
