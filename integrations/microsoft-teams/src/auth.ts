import { createMicrosoftGraphOauth } from '@slates/oauth-microsoft';
import { SlateAuth } from 'slates';
import { z } from 'zod';
import {
  BOT_FRAMEWORK_AUTH_METHOD_KEY,
  type BotFrameworkAuthInput,
  requestBotFrameworkToken,
  TEAMS_GLOBAL_SERVICE_URL
} from './lib/botFramework';
import { microsoftTeamsScopes } from './scopes';

// Graph connections act as a user, not a bot, so they are not chat-eligible.
export let graphAuthMethodKeys = [
  'oauth_common',
  'oauth_organizations',
  'oauth_organizations_full'
];

// Every scope declared on an auth method is requested in production, so
// scope tiers are separate auth methods:
// the standard methods request only scopes Microsoft lets regular users
// consent to, while "Work Only (Full Access)" adds the admin-consent-gated
// scopes and therefore shows "Need admin approval" until a Microsoft Entra
// admin grants tenant-wide consent.
let baseScopes = [
  {
    title: 'User Profile',
    description: 'Read signed-in user profile',
    scope: microsoftTeamsScopes.userRead
  },
  {
    title: 'Offline Access',
    description: 'Obtain refresh tokens for long-lived access',
    scope: microsoftTeamsScopes.offlineAccess
  },
  {
    title: 'Read Teams',
    description: 'Read basic team properties',
    scope: microsoftTeamsScopes.teamReadBasicAll
  },
  {
    title: 'Create Teams',
    description: 'Create new teams',
    scope: microsoftTeamsScopes.teamCreate
  },
  {
    title: 'Read Channels',
    description: 'Read basic channel properties',
    scope: microsoftTeamsScopes.channelReadBasicAll
  },
  {
    title: 'Read/Write Chats',
    description: 'Read, create, and send user chat messages',
    scope: microsoftTeamsScopes.chatReadWrite
  },
  {
    title: 'Send Channel Messages',
    description: 'Send messages in channels',
    scope: microsoftTeamsScopes.channelMessageSend
  },
  {
    title: 'Read/Write Online Meetings',
    description: 'Create and manage online meetings',
    scope: microsoftTeamsScopes.onlineMeetingsReadWrite
  },
  {
    title: 'Read Presence',
    description: 'Read user presence information',
    scope: microsoftTeamsScopes.presenceReadAll
  }
];

let adminConsentScopes = [
  {
    title: 'Read/Write Team Settings',
    description: 'Update, archive, and unarchive teams (requires Entra admin consent)',
    scope: microsoftTeamsScopes.teamSettingsReadWriteAll
  },
  {
    title: 'Create Channels',
    description: 'Create channels in teams (requires Entra admin consent)',
    scope: microsoftTeamsScopes.channelCreate
  },
  {
    title: 'Update Channels',
    description:
      'Update channel names, descriptions, and settings (requires Entra admin consent)',
    scope: microsoftTeamsScopes.channelSettingsReadWriteAll
  },
  {
    title: 'Delete Channels',
    description: 'Delete channels in teams (requires Entra admin consent)',
    scope: microsoftTeamsScopes.channelDeleteAll
  },
  {
    title: 'Read Channel Messages',
    description: 'Read messages in channels (requires Entra admin consent)',
    scope: microsoftTeamsScopes.channelMessageReadAll
  },
  {
    title: 'Read/Write Team Members',
    description: 'Read and manage team members (requires Entra admin consent)',
    scope: microsoftTeamsScopes.teamMemberReadWriteAll
  },
  {
    title: 'Read/Write Channel Members',
    description:
      'Read and manage members of private and shared channels (requires Entra admin consent)',
    scope: microsoftTeamsScopes.channelMemberReadWriteAll
  },
  {
    title: 'Read/Write Team Tags',
    description:
      'Create and manage team tags and tag membership (requires Entra admin consent)',
    scope: microsoftTeamsScopes.teamworkTagReadWrite
  },
  {
    title: 'Read/Write Groups',
    description:
      'Rename or delete the Microsoft 365 groups that back teams (requires Entra admin consent)',
    scope: microsoftTeamsScopes.groupReadWriteAll
  },
  {
    title: 'Read/Write Shifts',
    description: 'Read and write shift schedules (requires Entra admin consent)',
    scope: microsoftTeamsScopes.scheduleReadWriteAll
  }
];

let docs = [
  {
    type: 'docs.auth.oauth' as const,
    name: 'OAuth documentation',
    url: 'https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow'
  },
  {
    type: 'docs.auth.oauth_scopes' as const,
    name: 'OAuth scopes',
    url: 'https://learn.microsoft.com/en-us/graph/permissions-reference'
  }
];

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      // Bot Framework connections only.
      appId: z.string().optional(),
      tenantId: z.string().optional(),
      serviceUrl: z.string().optional(),
      botName: z.string().optional()
    })
  )
  .addOauth({
    ...createMicrosoftGraphOauth({
      name: 'Work & Personal',
      key: 'oauth_common',
      tenant: 'common',
      scopes: baseScopes,
      docs,
      missingRefreshTokenMessage: 'No refresh token available'
    }),
    adapters: []
  })
  .addOauth({
    ...createMicrosoftGraphOauth({
      name: 'Work Only',
      key: 'oauth_organizations',
      tenant: 'organizations',
      scopes: baseScopes,
      docs,
      missingRefreshTokenMessage: 'No refresh token available'
    }),
    adapters: []
  })
  .addOauth({
    ...createMicrosoftGraphOauth({
      name: 'Work Only (Full Access)',
      key: 'oauth_organizations_full',
      tenant: 'organizations',
      scopes: [...baseScopes, ...adminConsentScopes],
      docs,
      missingRefreshTokenMessage: 'No refresh token available'
    }),
    adapters: []
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Teams Bot (Azure Bot)',
    key: BOT_FRAMEWORK_AUTH_METHOD_KEY,
    adapters: ['chat'],
    docs: [
      {
        type: 'docs.auth.service_account',
        name: 'Bot Connector authentication',
        url: 'https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-connector-authentication?view=azure-bot-service-4.0'
      }
    ],
    inputSchema: z.object({
      appId: z
        .string()
        .describe('Microsoft App ID from the Azure Bot resource Configuration page'),
      clientSecret: z
        .string()
        .describe(
          'Client secret value created for the Microsoft App ID in Microsoft Entra ID'
        ),
      tenantId: z
        .string()
        .optional()
        .describe(
          'Directory (tenant) ID. Required for single-tenant bots and for opening direct messages; leave empty for multi-tenant bots.'
        ),
      serviceUrl: z
        .string()
        .optional()
        .describe(
          `Teams Bot Connector service URL used for outgoing messages. Defaults to ${TEAMS_GLOBAL_SERVICE_URL}`
        ),
      botName: z
        .string()
        .optional()
        .describe('Display name of the bot, used to label the bot and its workspace')
    }),

    getOutput: async (ctx: { input: BotFrameworkAuthInput }) => ({
      output: await requestBotFrameworkToken(ctx.input, 'bot token request')
    }),

    handleTokenRefresh: async (ctx: { input: BotFrameworkAuthInput }) => ({
      output: await requestBotFrameworkToken(ctx.input, 'bot token refresh')
    }),

    getProfile: async (ctx: { output: { appId?: string; botName?: string } }) => ({
      profile: {
        id: ctx.output.appId,
        name: ctx.output.botName ?? ctx.output.appId
      }
    })
  });
