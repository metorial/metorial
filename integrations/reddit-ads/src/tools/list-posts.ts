import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import {
  accountInput,
  id,
  invalid,
  optionalText,
  pagingOutput,
  row,
  unexpected
} from '../lib/contracts';
import { spec } from '../spec';

export const listPosts = SlateTool.create(spec, {
  key: 'list_posts',
  name: 'List Posts',
  description:
    'Discover the profiles linked to an ad account, then list one page of a profile’s posts. Use a returned postId as the creative when creating an ad with manage_ad.',
  instructions: [
    'Omit profileId to list the ad account’s profiles. Provide a returned profileId to list that profile’s posts.',
    'Follow nextUrl with the same account, profileId and filters to continue.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      accountId: accountInput,
      profileId: z
        .string()
        .optional()
        .describe('Profile ID (t2_...) from a previous call. Omit to list profiles.'),
      postType: z
        .enum(['CAROUSEL', 'IMAGE', 'TEXT', 'VIDEO'])
        .optional()
        .describe('Only return posts of this type.'),
      source: z
        .enum(['ORGANIC', 'PROMOTED'])
        .optional()
        .describe('Only return organic or promoted (ad-only) posts.'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum records in one page (up to 100).'),
      nextUrl: z
        .string()
        .optional()
        .describe('Exact nextUrl from the previous page; keep the same inputs.')
    })
  )
  .output(
    z.object({
      profiles: z
        .array(
          z.object({
            profileId: z.string(),
            name: z.string().optional(),
            businessId: z.string().optional(),
            raw: z.unknown()
          })
        )
        .optional(),
      posts: z
        .array(
          z.object({
            postId: z.string(),
            profileId: z.string().optional(),
            postType: z.string().optional(),
            headline: z.string().optional(),
            url: z.string().optional(),
            createdAt: z.string().optional(),
            raw: z.unknown()
          })
        )
        .optional(),
      ...pagingOutput
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    if (ctx.input.profileId === undefined) {
      if (ctx.input.postType !== undefined || ctx.input.source !== undefined)
        invalid('Provide profileId when filtering posts by postType or source.');
      const page = await client.profiles(ctx.input);
      return {
        output: {
          profiles: page.items.map(profile => ({
            profileId: id(profile.id),
            name: optionalText(profile.name),
            businessId: optionalText(profile.business_id),
            raw: profile
          })),
          nextUrl: page.nextUrl,
          hasMore: page.hasMore
        },
        message: `Retrieved ${page.items.length} profiles in this page. Provide a profileId to list its posts.`
      };
    }
    const profileId = id(ctx.input.profileId, 'Profile ID');
    const page = await client.posts(profileId, ctx.input);
    return {
      output: {
        posts: page.items.map(post => {
          if (post.profile_id != null && post.profile_id !== profileId) unexpected();
          const creative =
            post.creative === undefined || post.creative === null ? {} : row(post.creative);
          return {
            postId: id(post.id),
            profileId: optionalText(post.profile_id),
            postType: optionalText(creative.type),
            headline: optionalText(creative.headline),
            url: optionalText(post.url),
            createdAt: optionalText(post.created_at),
            raw: post
          };
        }),
        nextUrl: page.nextUrl,
        hasMore: page.hasMore
      },
      message: `Retrieved ${page.items.length} posts in this page${page.hasMore ? '; more pages are available' : ''}.`
    };
  })
  .build();
