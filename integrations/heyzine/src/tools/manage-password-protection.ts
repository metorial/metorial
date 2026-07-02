import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyzineClient } from '../lib/client';
import { spec } from '../spec';

export let managePasswordProtection = SlateTool.create(spec, {
  name: 'Manage Password Protection',
  key: 'manage_password_protection',
  description: `Configures password protection settings for a flipbook. Supports multiple access modes including per-user credentials, a single shared password, Google Sign-In, password-only, one-time password (OTP), and email-based access.
You can also customize the login screen text for username and password prompts.`,
  instructions: [
    'When mode is "everyone", a password is required.',
    'When mode is "disabled", password protection is removed entirely.',
    'Email link and send code modes require a Premium plan.'
  ]
})
  .input(
    z.object({
      flipbookId: z.string().describe('Unique identifier of the flipbook to protect.'),
      mode: z
        .enum(['users', 'everyone', 'disabled'])
        .describe(
          'Password protection mode: "users" for individual credentials, "everyone" for a shared password, "disabled" to remove protection.'
        ),
      password: z
        .string()
        .optional()
        .describe('Shared password for all visitors. Required when mode is "everyone".'),
      usernameLabel: z
        .string()
        .optional()
        .describe('Custom text for the username prompt on the login screen.'),
      passwordLabel: z
        .string()
        .optional()
        .describe('Custom text for the password prompt on the login screen.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyzineClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId
    });

    await client.updatePasswordProtection({
      flipbookId: ctx.input.flipbookId,
      mode: ctx.input.mode,
      password: ctx.input.password,
      usernameLabel: ctx.input.usernameLabel,
      passwordLabel: ctx.input.passwordLabel
    });

    let modeDescription =
      ctx.input.mode === 'disabled'
        ? 'Password protection disabled'
        : `Password protection set to **${ctx.input.mode}** mode`;

    return {
      output: {
        success: true
      },
      message: `${modeDescription} for flipbook **${ctx.input.flipbookId}**.`
    };
  })
  .build();
