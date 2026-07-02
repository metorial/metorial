import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyzineClient } from '../lib/client';
import { spec } from '../spec';

export let manageAccessList = SlateTool.create(spec, {
  name: 'Manage Access List',
  key: 'manage_access_list',
  description: `Adds or removes users from a flipbook's access list. Use this to control who can view a password-protected flipbook.
Supports multiple access types including username/password pairs, Google accounts, password-only, one-time passwords, and email-based access.`,
  instructions: [
    'Ensure password protection is enabled on the flipbook before managing the access list.',
    'For "user_pass" access type, both user and password are required for each entry.',
    'For "google" or "email_link" or "send_code" access types, only the user (email) is required.',
    'For "pass_only" or "otp" access types, only the password is required.'
  ]
})
  .input(
    z.object({
      flipbookId: z.string().describe('Unique identifier of the flipbook.'),
      action: z
        .enum(['add', 'remove'])
        .describe('Whether to add or remove users from the access list.'),
      accessType: z
        .enum(['user_pass', 'google', 'pass_only', 'otp', 'email_link', 'send_code'])
        .describe(
          'Type of access credential: "user_pass" for username+password, "google" for Google Sign-In, "pass_only" for password only, "otp" for one-time password, "email_link" or "send_code" for email-based access.'
        ),
      users: z
        .array(
          z.object({
            user: z
              .string()
              .optional()
              .describe(
                'Username or email for login. Required for user_pass, google, email_link, send_code access types.'
              ),
            password: z
              .string()
              .optional()
              .describe(
                'Password for login. Required for user_pass, pass_only, otp access types.'
              )
          })
        )
        .describe('List of user credentials to add or remove.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyzineClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId
    });

    let users = ctx.input.users.map(u => ({
      user: u.user || '',
      password: u.password
    }));

    await client.updateAccessList(
      ctx.input.flipbookId,
      ctx.input.accessType,
      users,
      ctx.input.action
    );

    let verb = ctx.input.action === 'add' ? 'Added' : 'Removed';

    return {
      output: {
        success: true
      },
      message: `${verb} **${ctx.input.users.length}** user(s) ${ctx.input.action === 'add' ? 'to' : 'from'} the access list of flipbook **${ctx.input.flipbookId}**.`
    };
  })
  .build();
