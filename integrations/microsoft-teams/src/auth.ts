import { createMicrosoftGraphOauth } from '@slates/oauth-microsoft';
import { SlateAuth } from 'slates';
import { z } from 'zod';

let scopes = [
  { title: 'User Profile', description: 'Read signed-in user profile', scope: 'User.Read' },
  {
    title: 'Offline Access',
    description: 'Obtain refresh tokens for long-lived access',
    scope: 'offline_access'
  },
  {
    title: 'Read Teams',
    description: 'Read basic team properties',
    scope: 'Team.ReadBasic.All'
  },
  {
    title: 'Read Team Settings',
    description: 'Read team settings',
    scope: 'TeamSettings.Read.All'
  },
  {
    title: 'Read/Write Team Settings',
    description: 'Read and modify team settings',
    scope: 'TeamSettings.ReadWrite.All'
  },
  {
    title: 'Read Channels',
    description: 'Read basic channel properties',
    scope: 'Channel.ReadBasic.All'
  },
  {
    title: 'Create Channels',
    description: 'Create channels in teams',
    scope: 'Channel.Create'
  },
  {
    title: 'Delete Channels',
    description: 'Delete channels in teams',
    scope: 'Channel.Delete.All'
  },
  { title: 'Read Chats', description: 'Read user chat messages', scope: 'Chat.Read' },
  {
    title: 'Read/Write Chats',
    description: 'Read and send chat messages',
    scope: 'Chat.ReadWrite'
  },
  {
    title: 'Read Chat Messages',
    description: 'Read chat and channel messages',
    scope: 'ChatMessage.Read'
  },
  {
    title: 'Send Chat Messages',
    description: 'Send chat messages',
    scope: 'ChatMessage.Send'
  },
  {
    title: 'Read Channel Messages',
    description: 'Read messages in channels',
    scope: 'ChannelMessage.Read.All'
  },
  {
    title: 'Send Channel Messages',
    description: 'Send messages in channels',
    scope: 'ChannelMessage.Send'
  },
  {
    title: 'Read Online Meetings',
    description: 'Read online meeting details',
    scope: 'OnlineMeetings.Read'
  },
  {
    title: 'Read/Write Online Meetings',
    description: 'Create and manage online meetings',
    scope: 'OnlineMeetings.ReadWrite'
  },
  {
    title: 'Read Presence',
    description: 'Read user presence information',
    scope: 'Presence.Read.All'
  },
  {
    title: 'Read/Write Team Members',
    description: 'Read and manage team members',
    scope: 'TeamMember.ReadWrite.All'
  },
  {
    title: 'Read/Write Team Tags',
    description: 'Create and manage team tags and tag membership',
    scope: 'TeamworkTag.ReadWrite'
  },
  {
    title: 'Read Group Members',
    description: 'Read group membership',
    scope: 'GroupMember.Read.All'
  },
  {
    title: 'Read/Write Group Members',
    description: 'Read and manage group membership',
    scope: 'GroupMember.ReadWrite.All'
  },
  {
    title: 'Read/Write Groups',
    description: 'Update or delete the Microsoft 365 groups that back Teams',
    scope: 'Group.ReadWrite.All'
  },
  { title: 'Read Directory', description: 'Read directory data', scope: 'Directory.Read.All' },
  {
    title: 'Read/Write Shifts',
    description: 'Read and write shift schedules',
    scope: 'Schedule.ReadWrite.All'
  },
  { title: 'Read Shifts', description: 'Read shift schedules', scope: 'Schedule.Read.All' }
];

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth(
    createMicrosoftGraphOauth({
      name: 'Work & Personal',
      key: 'oauth_common',
      tenant: 'common',
      scopes,
      docs: [
        {
          type: 'docs.auth.oauth',
          name: 'OAuth documentation',
          url: 'https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow'
        },
        {
          type: 'docs.auth.oauth_scopes',
          name: 'OAuth scopes',
          url: 'https://learn.microsoft.com/en-us/graph/permissions-reference'
        }
      ],
      missingRefreshTokenMessage: 'No refresh token available'
    })
  )
  .addOauth(
    createMicrosoftGraphOauth({
      name: 'Work Only',
      key: 'oauth_organizations',
      tenant: 'organizations',
      scopes,
      docs: [
        {
          type: 'docs.auth.oauth',
          name: 'OAuth documentation',
          url: 'https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow'
        },
        {
          type: 'docs.auth.oauth_scopes',
          name: 'OAuth scopes',
          url: 'https://learn.microsoft.com/en-us/graph/permissions-reference'
        }
      ],
      missingRefreshTokenMessage: 'No refresh token available'
    })
  );
