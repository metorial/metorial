import { SlateTool } from 'slates';
import { z } from 'zod';
import { DailyBotClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the user or agent identity associated with the API key. Use this to confirm the current credential owner.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      includeEmail: z.boolean().optional().describe('Request the email address when permitted')
    })
  )
  .output(
    z.object({
      userUuid: z
        .string()
        .optional()
        .describe('Identifier of the authenticated user or agent'),
      fullName: z.string().optional().describe('Display name of the authenticated identity'),
      email: z.string().optional().describe('Email address when included'),
      raw: z.any().describe('Full identity object from the API')
    })
  )
  .handleInvocation(async ctx => {
    let user = await new DailyBotClient({ token: ctx.auth.token }).getMe(
      ctx.input.includeEmail
    );
    let fullName =
      user.full_name ??
      user.name ??
      [user.first_name, user.last_name].filter(Boolean).join(' ');
    return {
      output: {
        userUuid: user.uuid ?? user.id,
        fullName: fullName || undefined,
        email: user.email,
        raw: user
      },
      message: fullName
        ? `Authenticated as **${fullName}**.`
        : 'Retrieved the authenticated identity.'
    };
  })
  .build();
