import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUserProfile = SlateTool.create(spec, {
  name: 'Get User Profile',
  key: 'get_user_profile',
  description: `Retrieve profile information for a Messenger user who has interacted with your Page. Returns available fields such as name, profile picture, locale, timezone, and gender.`,
  constraints: [
    'Only works for users who have previously messaged the Page.',
    'Some fields may not be available depending on user privacy settings and permissions.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      recipientId: z.string().describe('Page-Scoped User ID (PSID) of the user'),
      fields: z
        .array(
          z.enum(['first_name', 'last_name', 'profile_pic', 'locale', 'timezone', 'gender'])
        )
        .optional()
        .describe(
          'Specific profile fields to retrieve. Defaults to all available fields if not specified.'
        )
    })
  )
  .output(
    z.object({
      recipientId: z.string().describe('PSID of the user'),
      firstName: z.string().optional().describe('User first name'),
      lastName: z.string().optional().describe('User last name'),
      profilePic: z.string().optional().describe('URL of the user profile picture'),
      locale: z.string().optional().describe('User locale (e.g. en_US)'),
      timezone: z.number().optional().describe('User timezone offset from UTC'),
      gender: z.string().optional().describe('User gender')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      pageId: ctx.config.pageId,
      apiVersion: ctx.config.apiVersion
    });

    let profile = await client.getUserProfile(ctx.input.recipientId, ctx.input.fields);

    let nameParts = [profile.firstName, profile.lastName].filter(Boolean);
    let displayName = nameParts.length > 0 ? nameParts.join(' ') : ctx.input.recipientId;

    return {
      output: profile,
      message: `Retrieved profile for **${displayName}** (${ctx.input.recipientId}).`
    };
  })
  .build();
