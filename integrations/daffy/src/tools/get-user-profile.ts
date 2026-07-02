import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let causeSchema = z.object({
  causeId: z.number().describe('Unique identifier for the cause'),
  name: z.string().describe('Name of the cause'),
  color: z.string().describe('Hex color associated with the cause'),
  logo: z.string().describe('URL of the cause logo')
});

let fundMemberSchema = z.object({
  userId: z.number().describe('User ID of the fund member'),
  name: z.string().describe('Name of the fund member'),
  avatar: z.string().describe('Avatar URL of the fund member'),
  slug: z.string().describe('Profile URL slug of the fund member')
});

export let getUserProfile = SlateTool.create(spec, {
  name: 'Get User Profile',
  key: 'get_user_profile',
  description: `Retrieve a Daffy user profile including fund details, causes, and fund members. Can fetch your own profile or look up another user by their username.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      username: z
        .string()
        .optional()
        .describe('Username to look up. Leave empty to get your own profile.')
    })
  )
  .output(
    z.object({
      userId: z.number().describe('User ID'),
      name: z.string().describe('Full name of the user'),
      avatar: z.string().describe('Avatar image URL'),
      coverImage: z.string().describe('Cover image URL'),
      slug: z.string().describe('Profile URL slug'),
      fundName: z.string().describe('Name of the user fund'),
      followsUser: z.boolean().describe('Whether the authenticated user follows this user'),
      followsViewer: z.boolean().describe('Whether this user follows the authenticated user'),
      onboardingStatus: z.string().describe('Onboarding status (none or complete)'),
      fund: z
        .object({
          fundId: z.number().describe('Fund ID'),
          name: z.string().describe('Fund name'),
          summary: z.string().describe('Fund summary'),
          causes: z.array(causeSchema).describe('Causes associated with the fund'),
          members: z.array(fundMemberSchema).describe('Members of the fund')
        })
        .describe('Current fund details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let user = ctx.input.username
      ? await client.getUserByUsername(ctx.input.username)
      : await client.getMe();

    return {
      output: {
        userId: user.id,
        name: user.name,
        avatar: user.avatar,
        coverImage: user.cover_image,
        slug: user.slug,
        fundName: user.fund_name,
        followsUser: user.follows_user,
        followsViewer: user.follows_viewer,
        onboardingStatus: user.onboarding_status,
        fund: {
          fundId: user.current_fund.id,
          name: user.current_fund.name,
          summary: user.current_fund.summary,
          causes: user.current_fund.causes.map(c => ({
            causeId: c.id,
            name: c.name,
            color: c.color,
            logo: c.logo
          })),
          members: user.current_fund.users.map(u => ({
            userId: u.id,
            name: u.name,
            avatar: u.avatar,
            slug: u.slug
          }))
        }
      },
      message: ctx.input.username
        ? `Retrieved profile for user **${user.name}** (@${user.slug}), fund: **${user.current_fund.name}**.`
        : `Retrieved your profile: **${user.name}** (@${user.slug}), fund: **${user.current_fund.name}**.`
    };
  })
  .build();
