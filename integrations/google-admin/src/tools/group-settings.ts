import { z } from 'zod';

export let groupSettingsPatchSchema = z.object({
  whoCanJoin: z
    .enum([
      'ANYONE_CAN_JOIN',
      'ALL_IN_DOMAIN_CAN_JOIN',
      'INVITED_CAN_JOIN',
      'CAN_REQUEST_TO_JOIN'
    ])
    .optional()
    .describe('Who may join the group'),
  whoCanViewMembership: z
    .enum(['ALL_IN_DOMAIN_CAN_VIEW', 'ALL_MEMBERS_CAN_VIEW', 'ALL_MANAGERS_CAN_VIEW'])
    .optional()
    .describe('Who may see the member list'),
  whoCanViewGroup: z
    .enum([
      'ANYONE_CAN_VIEW',
      'ALL_IN_DOMAIN_CAN_VIEW',
      'ALL_MEMBERS_CAN_VIEW',
      'ALL_MANAGERS_CAN_VIEW'
    ])
    .optional()
    .describe('Who may see group discussions'),
  whoCanPostMessage: z
    .enum([
      'ALL_MANAGERS_CAN_POST',
      'ALL_MEMBERS_CAN_POST',
      'ALL_OWNERS_CAN_POST',
      'ALL_IN_DOMAIN_CAN_POST',
      'ANYONE_CAN_POST'
    ])
    .optional()
    .describe('Who may post messages to the group'),
  messageModerationLevel: z
    .enum([
      'MODERATE_ALL_MESSAGES',
      'MODERATE_NON_MEMBERS',
      'MODERATE_NEW_MEMBERS',
      'MODERATE_NONE'
    ])
    .optional()
    .describe('Which incoming messages require moderation'),
  allowExternalMembers: z
    .boolean()
    .optional()
    .describe('Whether people outside the Workspace organization may join')
});

export let groupSettingsOutputSchema = z.object({
  groupEmail: z.string().describe('Email address identifying the group'),
  settings: z.object({
    whoCanJoin: z.string().optional(),
    whoCanViewMembership: z.string().optional(),
    whoCanViewGroup: z.string().optional(),
    whoCanPostMessage: z.string().optional(),
    messageModerationLevel: z.string().optional(),
    allowExternalMembers: z.boolean().optional()
  })
});

let asString = (value: unknown) => (typeof value === 'string' ? value : undefined);

export let mapGroupSettings = (groupEmail: string, data: Record<string, unknown>) => ({
  groupEmail: asString(data.email) ?? groupEmail,
  settings: {
    whoCanJoin: asString(data.whoCanJoin),
    whoCanViewMembership: asString(data.whoCanViewMembership),
    whoCanViewGroup: asString(data.whoCanViewGroup),
    whoCanPostMessage: asString(data.whoCanPostMessage),
    messageModerationLevel: asString(data.messageModerationLevel),
    allowExternalMembers:
      data.allowExternalMembers === 'true' || data.allowExternalMembers === true
        ? true
        : data.allowExternalMembers === 'false' || data.allowExternalMembers === false
          ? false
          : undefined
  }
});
