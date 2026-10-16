import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { commentOutputSchema } from './add-comment';

export let listCommentsTool = SlateTool.create(spec, {
  name: 'List Comments',
  key: 'list_comments',
  description:
    'List comments on a Beamer post or feature request. Filter by date, language, text, or feature-request visibility and paginate through results.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      resourceType: z
        .enum(['post', 'feature_request'])
        .describe('Resource that owns the comments'),
      resourceId: z
        .number()
        .describe('Post or feature request ID from list_posts or list_feature_requests'),
      dateFrom: z.string().optional().describe('Comments after this date (ISO-8601)'),
      dateTo: z.string().optional().describe('Comments before this date (ISO-8601)'),
      language: z.string().optional().describe('ISO-639 two-letter language code'),
      search: z.string().optional().describe('Search comment text'),
      visible: z.boolean().optional().describe('Public visibility, for feature requests only'),
      maxResults: z.number().optional().describe('Maximum comments per page, from 1 to 10'),
      page: z.number().optional().describe('Nonnegative whole-number page index')
    })
  )
  .output(z.object({ comments: z.array(commentOutputSchema) }))
  .handleInvocation(async ctx => {
    if (ctx.input.resourceType === 'post' && ctx.input.visible !== undefined) {
      throw createApiServiceError('visible is only supported for feature request comments.');
    }
    let client = new Client({ token: ctx.auth.token });
    let { resourceType, resourceId, ...params } = ctx.input;
    let comments =
      resourceType === 'post'
        ? await client.listPostComments(resourceId, params)
        : await client.listFeatureRequestComments(resourceId, params);
    let output = comments.map(comment => ({
      commentId: comment.id,
      date: comment.date,
      text: comment.text,
      postTitle: comment.featureRequestTitle ?? comment.postTitle,
      featureRequestTitle: comment.featureRequestTitle,
      visible: comment.visible,
      url: comment.url,
      userId: comment.userId,
      userEmail: comment.userEmail,
      userFirstName: comment.userFirstName,
      userLastName: comment.userLastName
    }));
    return { output: { comments: output }, message: `Found **${output.length}** comment(s).` };
  })
  .build();
