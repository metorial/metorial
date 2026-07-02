import { SlateTool } from 'slates';
import { z } from 'zod';
import { PiloterrClient } from '../lib/client';
import { spec } from '../spec';

export let instagramProfile = SlateTool.create(spec, {
  name: 'Instagram Profile',
  key: 'instagram_profile',
  description: `Extract public data from an Instagram user profile including bio, follower/following counts, recent posts with engagement metrics, avatar, verification status, and business category.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      usernameOrUrl: z.string().describe('Instagram username or profile URL')
    })
  )
  .output(
    z.object({
      userId: z.string().optional(),
      username: z.string().optional(),
      name: z.string().optional(),
      description: z.string().optional(),
      avatar: z.string().optional(),
      followers: z.number().optional(),
      following: z.number().optional(),
      isPrivate: z.boolean().optional(),
      isVerified: z.boolean().optional(),
      isBusinessAccount: z.boolean().optional(),
      categoryName: z.string().optional(),
      website: z.string().optional(),
      posts: z
        .array(
          z.object({
            postId: z.string().optional(),
            shortcode: z.string().optional(),
            caption: z.string().optional(),
            likes: z.number().optional(),
            comments: z.number().optional(),
            isVideo: z.boolean().optional(),
            displayUrl: z.string().optional(),
            timestamp: z.number().optional()
          })
        )
        .optional()
        .describe('Recent posts'),
      raw: z.any().describe('Full raw response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let result = await client.getInstagramUser({ query: ctx.input.usernameOrUrl });

    let posts = (result.posts ?? []).map((p: any) => ({
      postId: p.id,
      shortcode: p.shortcode,
      caption: p.caption,
      likes: p.likes,
      comments: p.comments,
      isVideo: p.is_video,
      displayUrl: p.display_url,
      timestamp: p.timestamp
    }));

    return {
      output: {
        userId: result.id,
        username: result.username,
        name: result.name,
        description: result.description,
        avatar: result.avatar,
        followers: result.followers,
        following: result.following,
        isPrivate: result.private,
        isVerified: result.verified,
        isBusinessAccount: result.business_account,
        categoryName: result.category_name,
        website: result.website,
        posts,
        raw: result
      },
      message: `Retrieved Instagram profile **@${result.username ?? ctx.input.usernameOrUrl}**: **${result.followers ?? 0} followers**, **${posts.length} recent posts**.`
    };
  })
  .build();

export let instagramPost = SlateTool.create(spec, {
  name: 'Instagram Post',
  key: 'instagram_post',
  description: `Extract data from a specific Instagram post including caption, media URLs, engagement metrics (likes, comments, views), location, and sponsor information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      postUrlOrShortcode: z.string().describe('Instagram post URL or shortcode')
    })
  )
  .output(
    z.object({
      postId: z.string().optional(),
      shortcode: z.string().optional(),
      text: z.string().optional(),
      createdTime: z.string().optional(),
      likeCount: z.number().optional(),
      commentsCount: z.number().optional(),
      videoViewsCount: z.number().optional(),
      isVideo: z.boolean().optional(),
      mediaUrl: z.string().optional(),
      carouselMediaUrls: z.array(z.string()).optional(),
      ownerId: z.string().optional(),
      locationName: z.string().optional(),
      raw: z.any().describe('Full raw response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let result = await client.getInstagramPost({ query: ctx.input.postUrlOrShortcode });

    return {
      output: {
        postId: result.id,
        shortcode: result.shortcode,
        text: result.text,
        createdTime: result.created_time,
        likeCount: result.like_count,
        commentsCount: result.comments_count,
        videoViewsCount: result.video_views_count,
        isVideo: result.is_video,
        mediaUrl: result.attached_media_display_url,
        carouselMediaUrls: result.attached_carousel_media_urls,
        ownerId: result.owner_id,
        locationName: result.location_name,
        raw: result
      },
      message: `Retrieved Instagram post **${result.shortcode ?? ctx.input.postUrlOrShortcode}**: **${result.like_count ?? 0} likes**, **${result.comments_count ?? 0} comments**.`
    };
  })
  .build();
