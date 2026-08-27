import { SlateTool } from 'slates';
import { z } from 'zod';
import { slackUserAuthMethods } from '../lib/auth-methods';
import { SlackClient } from '../lib/client';
import { missingRequiredAlternativeError } from '../lib/errors';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let userStatusSchema = z.object({
  statusText: z.string().optional().describe('Custom Slack status text'),
  statusEmoji: z.string().optional().describe('Custom Slack status emoji, such as :memo:'),
  statusExpiration: z
    .number()
    .optional()
    .describe('Unix timestamp when the status expires, or 0 for no expiration')
});

let mapStatus = (profile: any) => ({
  statusText: profile?.status_text,
  statusEmoji: profile?.status_emoji,
  statusExpiration: profile?.status_expiration
});

export let manageUserStatus = SlateTool.create(spec, {
  name: 'Manage User Status',
  key: 'manage_user_status',
  description: `Get, set, or clear the authorized Slack user's custom status.`,
  constraints: [
    'This tool only manages the status for the connected Slack user; it does not accept an arbitrary user ID.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(slackActionScopes.userStatus)
  .authMethods(slackUserAuthMethods)
  .input(
    z.object({
      action: z.enum(['get', 'set', 'clear']).describe('Status action to perform'),
      statusText: z.string().optional().describe('Status text for the set action'),
      statusEmoji: z
        .string()
        .optional()
        .describe('Status emoji for the set action, such as :memo:'),
      statusExpiration: z
        .number()
        .optional()
        .describe('Unix timestamp when the status expires, or 0 for no expiration')
    })
  )
  .output(
    z.object({
      status: userStatusSchema.describe('The authorized user status after the action')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);

    if (ctx.input.action === 'get') {
      let profile = await client.getUserProfile();
      return {
        output: {
          status: mapStatus(profile)
        },
        message: 'Retrieved the authorized Slack user status.'
      };
    }

    if (ctx.input.action === 'clear') {
      let profile = await client.setUserProfile({
        statusText: '',
        statusEmoji: '',
        statusExpiration: 0
      });
      return {
        output: {
          status: mapStatus(profile)
        },
        message: 'Cleared the authorized Slack user status.'
      };
    }

    if (!ctx.input.statusText && !ctx.input.statusEmoji) {
      throw missingRequiredAlternativeError(
        'statusText or statusEmoji is required for set action'
      );
    }

    let profile = await client.setUserProfile({
      statusText: ctx.input.statusText ?? '',
      statusEmoji: ctx.input.statusEmoji ?? '',
      statusExpiration: ctx.input.statusExpiration ?? 0
    });

    return {
      output: {
        status: mapStatus(profile)
      },
      message: 'Updated the authorized Slack user status.'
    };
  })
  .build();
