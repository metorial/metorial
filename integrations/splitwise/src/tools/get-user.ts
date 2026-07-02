import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve a Splitwise user's profile by their user ID. Returns their name, email, registration status, and profile picture.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.number().describe('The Splitwise user ID to look up')
    })
  )
  .output(
    z.object({
      userId: z.number().describe('Unique user ID'),
      firstName: z.string().describe('First name'),
      lastName: z.string().nullable().describe('Last name'),
      email: z.string().describe('Email address'),
      registrationStatus: z
        .string()
        .describe('Registration status: confirmed, dummy, or invited'),
      picture: z
        .object({
          small: z.string().optional(),
          medium: z.string().optional(),
          large: z.string().optional()
        })
        .optional()
        .describe('Profile picture URLs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let user = await client.getUser(ctx.input.userId);

    return {
      output: {
        userId: user.id,
        firstName: user.first_name,
        lastName: user.last_name ?? null,
        email: user.email,
        registrationStatus: user.registration_status,
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
