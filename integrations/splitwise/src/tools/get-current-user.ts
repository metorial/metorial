import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let userSchema = z.object({
  userId: z.number().describe('Unique user ID'),
  firstName: z.string().describe('First name'),
  lastName: z.string().nullable().describe('Last name'),
  email: z.string().describe('Email address'),
  registrationStatus: z.string().describe('Registration status: confirmed, dummy, or invited'),
  defaultCurrency: z.string().optional().describe('Default currency code'),
  locale: z.string().optional().describe('User locale'),
  picture: z
    .object({
      small: z.string().optional(),
      medium: z.string().optional(),
      large: z.string().optional()
    })
    .optional()
    .describe('Profile picture URLs')
});

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: `Retrieve the authenticated user's profile including name, email, default currency, locale, and profile picture.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(userSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let user = await client.getCurrentUser();

    return {
      output: {
        userId: user.id,
        firstName: user.first_name,
        lastName: user.last_name ?? null,
        email: user.email,
        registrationStatus: user.registration_status,
        defaultCurrency: user.default_currency,
        locale: user.locale,
        picture: user.picture
          ? {
              small: user.picture.small,
              medium: user.picture.medium,
              large: user.picture.large
            }
          : undefined
      },
      message: `Retrieved profile for **${user.first_name} ${user.last_name || ''}** (${user.email})`
    };
  })
  .build();
