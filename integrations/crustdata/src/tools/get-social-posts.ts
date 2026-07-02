import { SlateTool } from 'slates';
import { z } from 'zod';
import { CrustdataClient } from '../lib/client';
import { spec } from '../spec';

export let getSocialPosts = SlateTool.create(spec, {
  name: 'Get Social Posts',
  key: 'get_social_posts',
  description: `Retrieve recent social media posts by a person or company, or search posts by keyword.
Returns post content, engagement metrics (likes, comments, shares), and profile data of people who interacted.
Supports three modes: person posts, company posts, or keyword-based post search.`,
  instructions: [
    'For person posts: provide personLinkedinUrl.',
    'For company posts: provide companyLinkedinUrl.',
    'For keyword search: provide keyword with optional sortBy and datePosted filters.',
    'Data is fetched in real-time with 30-60 second latency.'
  ],
  constraints: [
    'Limited to 20 results per request for person/company posts.',
    'Real-time latency: 30-60 seconds.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      personLinkedinUrl: z
        .string()
        .optional()
        .describe('LinkedIn profile URL of the person whose posts to retrieve.'),
      companyLinkedinUrl: z
        .string()
        .optional()
        .describe('LinkedIn company URL whose posts to retrieve.'),
      keyword: z.string().optional().describe('Keyword to search across LinkedIn posts.'),
      sortBy: z
        .enum(['date', 'relevance'])
        .optional()
        .describe('Sort order for keyword search results.'),
      datePosted: z
        .string()
        .optional()
        .describe(
          'Time filter for keyword search (e.g., "past-24h", "past-week", "past-month").'
        ),
      page: z.number().optional().describe('Page number for pagination.')
    })
  )
  .output(
    z.object({
      posts: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of social post objects with content and engagement metrics.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CrustdataClient(ctx.auth.token);
    let posts: unknown[] = [];

    if (ctx.input.personLinkedinUrl) {
      let result = await client.getSocialPostsByPerson({
        personLinkedinUrl: ctx.input.personLinkedinUrl,
        page: ctx.input.page
      });
      posts = Array.isArray(result) ? result : (result.posts ?? result.data ?? []);
    } else if (ctx.input.companyLinkedinUrl) {
      let result = await client.getLinkedinPostsByCompany({
        companyLinkedinUrl: ctx.input.companyLinkedinUrl,
        page: ctx.input.page
      });
      posts = Array.isArray(result) ? result : (result.posts ?? result.data ?? []);
    } else if (ctx.input.keyword) {
      let result = await client.searchLinkedinPostsByKeyword({
        keyword: ctx.input.keyword,
        page: ctx.input.page,
        sortBy: ctx.input.sortBy,
        datePosted: ctx.input.datePosted
      });
      posts = Array.isArray(result) ? result : (result.posts ?? result.data ?? []);
    }

    return {
      output: { posts: posts as Record<string, unknown>[] },
      message: `Retrieved **${posts.length}** social posts.`
    };
  })
  .build();
