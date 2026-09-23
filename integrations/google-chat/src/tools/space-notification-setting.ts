import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleChatClient } from '../lib/client';
import { googleChatValidationError } from '../lib/errors';
import { resolveGoogleChatSpaceName } from '../lib/resource-names';
import { googleChatActionAuthMethods, googleChatActionScopes } from '../scopes';
import { spec } from '../spec';

type GoogleChatSpaceNotificationSetting = {
  name?: string;
  notificationSetting?: string;
  muteSetting?: string;
};

let notificationSettingValues = ['ALL', 'MAIN_CONVERSATIONS', 'FOR_YOU', 'OFF'] as const;
let muteSettingValues = ['UNMUTED', 'MUTED'] as const;

let spaceInput = z
  .string()
  .trim()
  .min(1)
  .optional()
  .describe(
    'Space ID or spaces/{space} resource name; defaults to defaultSpace. Call search_conversations to discover spaces.'
  );

let notificationSettingOutputSchema = z.object({
  spaceName: z.string().describe('Space resource name'),
  settingName: z
    .string()
    .describe('Setting resource name, users/{user}/spaces/{space}/spaceNotificationSetting'),
  notificationSetting: z
    .string()
    .optional()
    .describe(
      'Which events notify the user: ALL, MAIN_CONVERSATIONS (mentions, followed threads, and new threads), FOR_YOU (mentions and followed threads), or OFF'
    ),
  muteSetting: z
    .string()
    .optional()
    .describe(
      'UNMUTED or MUTED; MUTED silences all notifications regardless of notificationSetting'
    )
});

let notificationConstraints = [
  "Reads and changes only the signed-in user's own settings.",
  'Requires a Google Workspace account with access to Google Chat.'
];

let settingPath = (spaceName: string) => `users/me/${spaceName}/spaceNotificationSetting`;

let mapSetting = (
  spaceName: string,
  path: string,
  setting: GoogleChatSpaceNotificationSetting
) => ({
  spaceName,
  settingName: setting.name ?? path,
  notificationSetting: setting.notificationSetting,
  muteSetting: setting.muteSetting
});

export let getSpaceNotificationSetting = SlateTool.create(spec, {
  name: 'Get Space Notification Setting',
  key: 'get_space_notification_setting',
  description:
    "Get the signed-in user's notification and mute settings for a Google Chat space.",
  constraints: notificationConstraints,
  tags: {
    readOnly: true
  }
})
  .scopes(googleChatActionScopes.getSpaceNotificationSetting)
  .authMethods(googleChatActionAuthMethods.getSpaceNotificationSetting)
  .input(z.object({ space: spaceInput }))
  .output(notificationSettingOutputSchema)
  .handleInvocation(async ctx => {
    let spaceName = resolveGoogleChatSpaceName(ctx.input.space, ctx.config.defaultSpace);
    let path = settingPath(spaceName);
    let client = new GoogleChatClient(ctx.auth.token);
    let response = await client.request<GoogleChatSpaceNotificationSetting>(path, {
      method: 'get',
      operation: 'get space notification setting'
    });
    let output = mapSetting(spaceName, path, response);

    return {
      output,
      message: `Notifications for \`${spaceName}\`: ${output.notificationSetting ?? 'unspecified'}, ${output.muteSetting ?? 'mute unspecified'}.`
    };
  })
  .build();

export let updateSpaceNotificationSetting = SlateTool.create(spec, {
  name: 'Update Space Notification Setting',
  key: 'update_space_notification_setting',
  description:
    "Change the signed-in user's notification level or mute state for a Google Chat space.",
  instructions: [
    'Set notificationSetting to ALL, MAIN_CONVERSATIONS, FOR_YOU, or OFF. MAIN_CONVERSATIONS and FOR_YOU are not available in one-to-one direct messages.',
    'Set muteSetting to MUTED to silence the space entirely, or UNMUTED to restore notifications.'
  ],
  constraints: notificationConstraints,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleChatActionScopes.updateSpaceNotificationSetting)
  .authMethods(googleChatActionAuthMethods.updateSpaceNotificationSetting)
  .input(
    z.object({
      space: spaceInput,
      notificationSetting: z
        .enum(notificationSettingValues)
        .optional()
        .describe('Which events should notify the user'),
      muteSetting: z.enum(muteSettingValues).optional().describe('Mute or unmute the space')
    })
  )
  .output(notificationSettingOutputSchema)
  .handleInvocation(async ctx => {
    let { notificationSetting, muteSetting } = ctx.input;
    let updateMask = [
      notificationSetting !== undefined ? 'notificationSetting' : undefined,
      muteSetting !== undefined ? 'muteSetting' : undefined
    ].filter(Boolean);
    if (updateMask.length === 0) {
      throw googleChatValidationError('Provide notificationSetting, muteSetting, or both.');
    }

    let spaceName = resolveGoogleChatSpaceName(ctx.input.space, ctx.config.defaultSpace);
    let path = settingPath(spaceName);
    let client = new GoogleChatClient(ctx.auth.token);
    let response = await client.request<GoogleChatSpaceNotificationSetting>(path, {
      method: 'patch',
      params: { updateMask: updateMask.join(',') },
      data: {
        ...(notificationSetting !== undefined ? { notificationSetting } : {}),
        ...(muteSetting !== undefined ? { muteSetting } : {})
      },
      operation: 'update space notification setting'
    });
    let output = mapSetting(spaceName, path, response);

    return {
      output,
      message: `Updated notifications for \`${spaceName}\`: ${output.notificationSetting ?? notificationSetting ?? 'unchanged'}, ${output.muteSetting ?? muteSetting ?? 'unchanged'}.`
    };
  })
  .build();
