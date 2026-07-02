import { SlateTool } from 'slates';
import { z } from 'zod';
import { OktaClient } from '../lib/client';
import { spec } from '../spec';

export let userLifecycleTool = SlateTool.create(spec, {
  name: 'User Lifecycle',
  key: 'user_lifecycle',
  description: `Perform lifecycle operations on an Okta user: **activate**, **deactivate**, **suspend**, **unsuspend**, **unlock**, **reset_password**, **reset_factors**, or **delete**. Each action transitions the user to a new status.`,
  instructions: [
    'A user must be in PROVISIONED or STAGED status to be activated.',
    'A user must be in ACTIVE status to be suspended or deactivated.',
    'A user must be in SUSPENDED status to be unsuspended.',
    'A user must be in LOCKED_OUT status to be unlocked.',
    'Deleting a user requires deactivating them first, then deleting.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('Okta user ID or login'),
      action: z
        .enum([
          'activate',
          'deactivate',
          'suspend',
          'unsuspend',
          'unlock',
          'reset_password',
          'reset_factors',
          'delete'
        ])
        .describe('Lifecycle action to perform'),
      sendEmail: z
        .boolean()
        .optional()
        .describe(
          'Whether to send a notification email to the user (applies to activate, deactivate, reset_password)'
        )
    })
  )
  .output(
    z.object({
      userId: z.string(),
      action: z.string().describe('The action that was performed'),
      success: z.boolean(),
      activationUrl: z
        .string()
        .optional()
        .describe('Activation URL returned when activating with sendEmail=false'),
      resetPasswordUrl: z
        .string()
        .optional()
        .describe('Password reset URL returned when resetting with sendEmail=false')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OktaClient({
      domain: ctx.config.domain,
      token: ctx.auth.token
    });

    let { userId, action, sendEmail } = ctx.input;
    let activationUrl: string | undefined;
    let resetPasswordUrl: string | undefined;

    if (action === 'delete') {
      await client.deleteUser(userId, sendEmail);
    } else {
      let result = await client.performUserLifecycle(userId, action, sendEmail);
      if (action === 'activate' && result?.activationUrl) {
        activationUrl = result.activationUrl;
      }
      if (action === 'reset_password' && result?.resetPasswordUrl) {
        resetPasswordUrl = result.resetPasswordUrl;
      }
    }

    return {
      output: {
        userId,
        action,
        success: true,
        activationUrl,
        resetPasswordUrl
      },
      message: `Successfully performed **${action}** on user \`${userId}\`.`
    };
  })
  .build();
