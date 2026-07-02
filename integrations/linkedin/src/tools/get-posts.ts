import { SlateTool } from 'slates';
import { z } from 'zod';
import { LinkedInClient } from '../lib/client';
import { spec } from '../spec';

export let getPosts = SlateTool.create(spec, {
  name: 'Get Posts',
  key: 'get_posts',
  description: `Retrieve posts by a specific author (member or organization) from LinkedIn. Returns a paginated list of posts with their content, visibility, and metadata. Can also retrieve a single post by its URN.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      postUrn: z
        .string()
        .optional()
        .describe('URN of a specific post to retrieve. If provided, authorUrn is ignored.'),
      authorUrn: z
        .string()
        .optional()
        .describe(
          'URN of the author whose posts to retrieve, e.g. "urn:li:person:abc123" or "urn:li:organization:12345"'
        ),
      count: z.number().optional().describe('Number of posts to return (max 100)'),
      start: z.number().optional().describe('Pagination offset (0-based index)')
    })
  )
  .output(
    z.object({
      posts: z.array(
        z.object({
          postUrn: z.string().optional().describe('URN of the post'),
          authorUrn: z.string().describe('URN of the post author'),
          text: z.string().optional().describe('Post text/commentary'),
          visibility: z.string().describe('Post visibility setting'),
          lifecycleState: z.string().describe('Post lifecycle state'),
          publishedAt: z
            .string()
            .optional()
            .describe('ISO timestamp when the post was published'),
          lastModifiedAt: z.string().optional().describe('ISO timestamp of last modification'),
          hasArticle: z.boolean().describe('Whether the post includes a shared article/link'),
          hasMedia: z.boolean().describe('Whether the post includes attached media')
        })
      ),
      totalCount: z.number().optional().describe('Total number of posts available'),
      nextStart: z.number().optional().describe('Start index for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LinkedInClient({ token: ctx.auth.token });

    if (ctx.input.postUrn) {
      let post = await client.getPost(ctx.input.postUrn);
      let mapped = mapPost(post, ctx.input.postUrn);
      return {
        output: { posts: [mapped] },
        message: `Retrieved post \`${ctx.input.postUrn}\` by **${post.author}**.`
      };
    }

    if (!ctx.input.authorUrn) {
      throw new Error('Either postUrn or authorUrn must be provided');
    }

    let result = await client.getPostsByAuthor(ctx.input.authorUrn, {
      count: ctx.input.count,
      start: ctx.input.start
    });

    let posts = result.elements.map(p => mapPost(p));
    let totalCount = result.paging?.total;
    let nextStart = result.paging ? result.paging.start + result.paging.count : undefined;

    return {
      output: { posts, totalCount, nextStart },
      message: `Retrieved **${posts.length}** posts for author \`${ctx.input.authorUrn}\`${totalCount !== undefined ? ` (${totalCount} total)` : ''}.`
    };
  })
  .build();

let mapPost = (post: any, urn?: string) => ({
  postUrn: urn || post.id,
  authorUrn: post.author,
  text: post.commentary,
  visibility: post.visibility,
  lifecycleState: post.lifecycleState,
  publishedAt: post.publishedAt,
  lastModifiedAt: post.lastModifiedAt,
  hasArticle: !!post.content?.article,
  hasMedia: !!post.content?.media
});
