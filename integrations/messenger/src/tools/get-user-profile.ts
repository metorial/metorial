import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createMessengerClient } from '../lib/client';
import { spec } from '../spec';

export let getUserProfile = SlateTool.create(spec, {
  name: 'Get User Profile',
  key: 'get_user_profile',
  description: `Retrieve profile information for a Messenger user who has interacted with your Page. Returns the name and profile picture by default; locale, timezone, and gender can be requested when the Page has the matching permissions.`,
  constraints: [
    'Only works for users who have previously messaged the Page.',
    'Name and profile picture need the Business Asset User Profile Access feature; locale, timezone, and gender each need their own Page permission (pages_user_locale, pages_user_timezone, pages_user_gender).',
    'When Messenger does not allow access to the profile, only the recipientId is returned.'
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
          z.enum([
            'first_name',
            'last_name',
            'profile_pic',
            'locale',
            'timezone',
            'gender',
            'name'
          ])
        )
        .optional()
        .describe(
          'Specific profile fields to retrieve. Defaults to name, first_name, last_name, and profile_pic. Request locale, timezone, or gender only when the Page has the matching permission.'
        )
    })
  )
  .output(
    z.object({
      recipientId: z.string().describe('PSID of the user'),
      name: z.string().optional().describe('User full name'),
      firstName: z.string().optional().describe('User first name'),
      lastName: z.string().optional().describe('User last name'),
      profilePic: z
        .string()
        .optional()
        .describe('URL of the user profile picture. The URL expires.'),
      locale: z.string().optional().describe('User locale (e.g. en_US)'),
      timezone: z.number().optional().describe('User timezone offset from UTC'),
      gender: z.string().optional().describe('User gender')
    })
  )
  .handleInvocation(async ctx => {
    let client = createMessengerClient(ctx);

    let profile = await client.getUserProfile(ctx.input.recipientId, ctx.input.fields);

    let nameParts = [profile.firstName, profile.lastName].filter(Boolean);
    let displayName =
      profile.name || (nameParts.length > 0 ? nameParts.join(' ') : ctx.input.recipientId);

    return {
      output: profile,
      message: `Retrieved profile for **${displayName}** (${ctx.input.recipientId}).`
    };
  })
  .build();
