import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve a Hashnode user's public profile by username, or get the authenticated user's profile (including email). Returns bio, social links, follower counts, and more.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      username: z
        .string()
        .optional()
        .describe("Username to look up. Omit to get the authenticated user's profile")
    })
  )
  .output(
    z.object({
      userId: z.string().describe('Unique user ID'),
      username: z.string().describe('Username'),
      name: z.string().nullable().optional().describe('Display name'),
      email: z
        .string()
        .nullable()
        .optional()
        .describe('Email (only available for authenticated user)'),
      profilePicture: z.string().nullable().optional().describe('Profile picture URL'),
      tagline: z.string().nullable().optional().describe('User tagline'),
      bioMarkdown: z.string().nullable().optional().describe('Bio in Markdown'),
      followersCount: z.number().nullable().optional().describe('Number of followers'),
      followingsCount: z
        .number()
        .nullable()
        .optional()
        .describe('Number of users being followed'),
      location: z.string().nullable().optional().describe('User location'),
      dateJoined: z.string().nullable().optional().describe('When the user joined Hashnode'),
      availableFor: z
        .string()
        .nullable()
        .optional()
        .describe('What the user is available for'),
      socialLinks: z
        .object({
          website: z.string().nullable().optional(),
          github: z.string().nullable().optional(),
          twitter: z.string().nullable().optional(),
          instagram: z.string().nullable().optional(),
          facebook: z.string().nullable().optional(),
          stackoverflow: z.string().nullable().optional(),
          linkedin: z.string().nullable().optional(),
          youtube: z.string().nullable().optional()
        })
        .nullable()
        .optional()
        .describe('Social media links')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      publicationHost: ctx.config.publicationHost
    });

    let user: any;
    if (ctx.input.username) {
      user = await client.getUser(ctx.input.username);
    } else {
      user = await client.getMe();
    }

    if (!user) throw new Error('User not found');

    return {
      output: {
        userId: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        tagline: user.tagline,
        bioMarkdown: user.bio?.markdown,
        followersCount: user.followersCount,
        followingsCount: user.followingsCount,
        location: user.location,
        dateJoined: user.dateJoined,
        availableFor: user.availableFor,
        socialLinks: user.socialMediaLinks
          ? {
              website: user.socialMediaLinks.website,
              github: user.socialMediaLinks.github,
              twitter: user.socialMediaLinks.twitter,
              instagram: user.socialMediaLinks.instagram,
              facebook: user.socialMediaLinks.facebook,
              stackoverflow: user.socialMediaLinks.stackoverflow,
              linkedin: user.socialMediaLinks.linkedin,
              youtube: user.socialMediaLinks.youtube
            }
          : null
      },
      message: `Retrieved profile for **${user.name || user.username}**`
    };
  })
  .build();
