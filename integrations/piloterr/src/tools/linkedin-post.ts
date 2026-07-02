import { SlateTool } from 'slates';
import { z } from 'zod';
import { PiloterrClient } from '../lib/client';
import { spec } from '../spec';

export let linkedinPost = SlateTool.create(spec, {
  name: 'LinkedIn Post',
  key: 'linkedin_post',
  description: `Extract structured data from a LinkedIn post including text content, author information, engagement metrics (likes, comments), hashtags, images, videos, shared links, and mentioned profiles.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      postIdOrUrl: z.string().describe('LinkedIn post ID or full post URL')
    })
  )
  .output(
    z.object({
      postId: z.string().optional(),
      url: z.string().optional(),
      text: z.string().optional(),
      author: z
        .object({
          url: z.string().optional(),
          fullName: z.string().optional(),
          imageUrl: z.string().optional(),
          profileType: z.string().optional()
        })
        .optional(),
      likeCount: z.number().optional(),
      commentsCount: z.number().optional(),
      totalEngagement: z.number().optional(),
      datePublished: z.string().optional(),
      hashtags: z.array(z.string()).optional(),
      images: z.array(z.string()).optional(),
      raw: z.any().describe('Full raw response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let result = await client.getLinkedInPost({ query: ctx.input.postIdOrUrl });

    return {
      output: {
        postId: result.id,
        url: result.url,
        text: result.text,
        author: result.author
          ? {
              url: result.author.url,
              fullName: result.author.full_name,
              imageUrl: result.author.image_url,
              profileType: result.author.profile_type
            }
          : undefined,
        likeCount: result.like_count,
        commentsCount: result.comments_count,
        totalEngagement: result.total_engagement,
        datePublished: result.date_published,
        hashtags: result.hashtags,
        images: result.images,
        raw: result
      },
      message: `Retrieved LinkedIn post by **${result.author?.full_name ?? 'Unknown'}** with **${result.like_count ?? 0} likes** and **${result.comments_count ?? 0} comments**.`
    };
  })
  .build();
