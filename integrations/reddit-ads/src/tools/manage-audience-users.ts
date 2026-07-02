import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedditAdsClient } from '../lib/client';
import { spec } from '../spec';

export let manageAudienceUsers = SlateTool.create(spec, {
  name: 'Manage Audience Users',
  key: 'manage_audience_users',
  description: `Add or remove users from a custom audience. Users are identified by SHA256-hashed email addresses or mobile advertising IDs (MAIDs). Supports batch operations for updating audience membership.`,
  instructions: [
    'Email addresses and MAIDs must be SHA256-hashed and lowercased before submission.',
    'For email-only lists, set identifierType to EMAIL_SHA256. For MAID-only lists, use MAID_SHA256. For both, use BOTH.',
    'The audience ID is typically in the format "ca.xxxxxxxxxxx".'
  ],
  constraints: [
    'Audiences created in Ads Manager are limited to 1 million users; the API supports larger audiences.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      audienceId: z.string().describe('Custom audience ID (e.g., "ca.xxxxxxxxxxx")'),
      action: z.enum(['ADD', 'REMOVE']).describe('Whether to add or remove users'),
      identifierType: z
        .enum(['EMAIL_SHA256', 'MAID_SHA256', 'BOTH'])
        .describe('Type of user identifiers being provided'),
      users: z
        .array(
          z.object({
            emailSha256: z
              .string()
              .optional()
              .describe('SHA256-hashed lowercase email address'),
            maidSha256: z.string().optional().describe('SHA256-hashed mobile advertising ID')
          })
        )
        .describe('List of user identifiers to add or remove')
    })
  )
  .output(
    z.object({
      audienceId: z.string(),
      action: z.string(),
      usersProcessed: z.number(),
      raw: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedditAdsClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let columnOrder: string[] = [];
    if (ctx.input.identifierType === 'EMAIL_SHA256') {
      columnOrder = ['EMAIL_SHA256'];
    } else if (ctx.input.identifierType === 'MAID_SHA256') {
      columnOrder = ['MAID_SHA256'];
    } else {
      columnOrder = ['EMAIL_SHA256', 'MAID_SHA256'];
    }

    let userData = ctx.input.users.map(user => {
      if (ctx.input.identifierType === 'EMAIL_SHA256') {
        return [user.emailSha256 || ''];
      } else if (ctx.input.identifierType === 'MAID_SHA256') {
        return [user.maidSha256 || ''];
      } else {
        return [user.emailSha256 || '', user.maidSha256 || ''];
      }
    });

    let result = await client.manageAudienceUsers(ctx.input.audienceId, {
      action_type: ctx.input.action,
      column_order: columnOrder,
      user_data: userData
    });

    return {
      output: {
        audienceId: ctx.input.audienceId,
        action: ctx.input.action,
        usersProcessed: ctx.input.users.length,
        raw: result
      },
      message: `**${ctx.input.action === 'ADD' ? 'Added' : 'Removed'}** ${ctx.input.users.length} user(s) ${ctx.input.action === 'ADD' ? 'to' : 'from'} audience **${ctx.input.audienceId}**.`
    };
  })
  .build();
