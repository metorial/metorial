import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { accountInput, invalid } from '../lib/contracts';
import { spec } from '../spec';

export let manageAudienceUsers = SlateTool.create(spec, {
  name: 'Manage Audience Users',
  key: 'manage_audience_users',
  description:
    'Submit hashed user rows for a selected customer-list audience. A 204 response acknowledges the request; it does not supply a processed-user count or prove completed matching.',
  instructions: [
    'Email addresses and MAIDs must be SHA256-hashed and lowercased before submission.',
    'For email-only lists, set identifierType to EMAIL_SHA256. For MAID-only lists, use MAID_SHA256. For both, use BOTH.',
    'The audience ID is typically in the format "ca.xxxxxxxxxxx".'
  ],
  constraints: ['Maximum 2500 rows; all selected hash columns must be present.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      accountId: accountInput,
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
      usersSubmitted: z.number(),
      acknowledged: z.boolean(),
      processingVerified: z.boolean(),
      audienceId: z.string(),
      action: z.string(),
      usersProcessed: z.number().optional(),
      raw: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.users.length < 1 || ctx.input.users.length > 2500)
      invalid('Provide 1–2500 audience users.');
    const columns =
      ctx.input.identifierType === 'BOTH'
        ? ['EMAIL_SHA256', 'MAID_SHA256']
        : [ctx.input.identifierType];
    const userData = ctx.input.users.map(user =>
      columns.map(column => {
        const value = column === 'EMAIL_SHA256' ? user.emailSha256 : user.maidSha256;
        if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value))
          invalid(
            'Every selected audience column requires a 64-character lowercase SHA-256 hash.'
          );
        return value;
      })
    );
    await createClient(ctx).audienceUsers(ctx.input.audienceId, {
      action_type: ctx.input.action,
      column_order: columns,
      user_data: userData
    });
    return {
      output: {
        audienceId: ctx.input.audienceId,
        action: ctx.input.action,
        usersSubmitted: ctx.input.users.length,
        acknowledged: true,
        processingVerified: false
      },
      message:
        'Reddit acknowledged the membership request with no content. No processed-user count or completed audience matching is asserted.'
    };
  })
  .build();
