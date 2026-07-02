import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let badgeCountSchema = z.object({
  gold: z.number().optional(),
  silver: z.number().optional(),
  bronze: z.number().optional()
});

export let getUser = SlateTool.create(spec, {
  name: 'Get User Profile',
  key: 'get_user',
  description: `Retrieve a user's profile including reputation, badge counts, and top tags. Use "me" as the userId to get the authenticated user's profile. Can also search for users by display name.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe('User ID to look up, or "me" for the authenticated user'),
      displayName: z
        .string()
        .optional()
        .describe('Search for users by display name (used when userId is not provided)'),
      includeTopTags: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to include the user's top answer tags")
    })
  )
  .output(
    z.object({
      userId: z.number().describe('Unique identifier of the user'),
      displayName: z.string().describe('Display name of the user'),
      profileImage: z.string().optional().describe("URL to the user's profile image"),
      link: z.string().optional().describe("URL to the user's profile page"),
      reputation: z.number().describe("User's reputation score"),
      badgeCounts: badgeCountSchema.optional().describe('Number of badges by type'),
      questionCount: z.number().optional().describe('Number of questions asked'),
      answerCount: z.number().optional().describe('Number of answers posted'),
      creationDate: z.string().describe('When the account was created (ISO 8601)'),
      lastAccessDate: z.string().optional().describe('When the user last visited (ISO 8601)'),
      location: z.string().optional().describe("User's stated location"),
      websiteUrl: z.string().optional().describe("User's website URL"),
      aboutMe: z.string().optional().describe('User\'s "About Me" text (HTML)'),
      topTags: z
        .array(
          z.object({
            tagName: z.string(),
            answerCount: z.number(),
            answerScore: z.number(),
            questionCount: z.number(),
            questionScore: z.number()
          })
        )
        .optional()
        .describe("User's top tags by answer score")
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      key: ctx.auth.key,
      site: ctx.config.site
    });

    let user: any;

    if (ctx.input.userId === 'me') {
      let result = await client.getMe();
      user = result.items[0];
    } else if (ctx.input.userId) {
      let result = await client.getUsersByIds([ctx.input.userId]);
      user = result.items[0];
    } else if (ctx.input.displayName) {
      let result = await client.getUsers({ inName: ctx.input.displayName, pageSize: 1 });
      user = result.items[0];
    } else {
      throw new Error('Either userId or displayName must be provided.');
    }

    if (!user) {
      throw new Error('User not found.');
    }

    let topTags: any[] | undefined;
    if (ctx.input.includeTopTags && ctx.input.userId !== 'me') {
      let uid = ctx.input.userId ?? String(user.user_id);
      let tagsResult = await client.getUserTopTags(uid);
      topTags = tagsResult.items.map((t: any) => ({
        tagName: t.tag_name,
        answerCount: t.answer_count,
        answerScore: t.answer_score,
        questionCount: t.question_count,
        questionScore: t.question_score
      }));
    }

    let output = {
      userId: user.user_id,
      displayName: user.display_name,
      profileImage: user.profile_image,
      link: user.link,
      reputation: user.reputation,
      badgeCounts: user.badge_counts
        ? {
            gold: user.badge_counts.gold,
            silver: user.badge_counts.silver,
            bronze: user.badge_counts.bronze
          }
        : undefined,
      questionCount: user.question_count,
      answerCount: user.answer_count,
      creationDate: new Date(user.creation_date * 1000).toISOString(),
      lastAccessDate: user.last_access_date
        ? new Date(user.last_access_date * 1000).toISOString()
        : undefined,
      location: user.location,
      websiteUrl: user.website_url,
      aboutMe: user.about_me,
      topTags
    };

    return {
      output,
      message: `Retrieved profile for **${user.display_name}** (reputation: ${user.reputation}).`
    };
  })
  .build();
