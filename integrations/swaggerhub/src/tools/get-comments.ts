import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let commentSchema = z
  .object({
    commentId: z.string().optional().describe('Unique comment identifier'),
    id: z.string().optional().describe('Provider comment identifier'),
    user: z
      .object({ id: z.string(), active: z.boolean().optional() })
      .optional()
      .describe('User who created the comment'),
    body: z.string().optional().describe('Comment text'),
    createdBy: z.string().optional().describe('User who created the comment'),
    created: z.string().optional().describe('Creation timestamp'),
    modified: z.string().optional().describe('Last modification timestamp'),
    position: z.number().optional().describe('Line position in the spec'),
    status: z.string().optional().describe('Comment status (OPEN, RESOLVED)'),
    replies: z
      .array(
        z
          .object({
            replyId: z.string().optional().describe('Reply identifier'),
            id: z.string().optional().describe('Provider reply identifier'),
            user: z
              .object({ id: z.string(), active: z.boolean().optional() })
              .optional()
              .describe('User who created the reply'),
            body: z.string().optional().describe('Reply text'),
            createdBy: z.string().optional().describe('User who created the reply'),
            created: z.string().optional().describe('Creation timestamp'),
            modified: z.string().optional().describe('Last modification timestamp')
          })
          .passthrough()
      )
      .optional()
      .describe('Replies to this comment')
  })
  .passthrough();

export let getComments = SlateTool.create(spec, {
  name: 'Get Comments',
  key: 'get_comments',
  description: `Retrieve all comments and replies on a specific API or domain version in SwaggerHub. Useful for reviewing team feedback, design discussions, and review workflows around API specifications.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z
        .string()
        .optional()
        .describe('Owner (username or organization). Falls back to config owner.'),
      resourceName: z.string().describe('Name of the API or domain'),
      version: z.string().describe('Version to get comments for'),
      resourceType: z.enum(['api', 'domain']).describe('Whether this is an API or a domain')
    })
  )
  .output(
    z.object({
      comments: z.array(commentSchema).describe('List of comments with replies'),
      totalCount: z.number().describe('Total number of comments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let owner = ctx.input.owner || ctx.config.owner;
    if (!owner)
      throw createApiServiceError(
        'Owner is required. Provide it in the input or configure a default owner.'
      );

    let comments: unknown;
    if (ctx.input.resourceType === 'api') {
      comments = await client.getApiComments(owner, ctx.input.resourceName, ctx.input.version);
    } else {
      comments = await client.getDomainComments(
        owner,
        ctx.input.resourceName,
        ctx.input.version
      );
    }

    let parsed = commentSchema.array().safeParse(comments);
    if (!parsed.success) throw createApiServiceError('SwaggerHub returned invalid comments.');
    let commentList = parsed.data.map(comment => ({
      ...comment,
      commentId: comment.commentId ?? comment.id,
      createdBy: comment.createdBy ?? comment.user?.id,
      replies: comment.replies?.map(reply => ({
        ...reply,
        replyId: reply.replyId ?? reply.id,
        createdBy: reply.createdBy ?? reply.user?.id
      }))
    }));

    return {
      output: {
        comments: commentList,
        totalCount: commentList.length
      },
      message: `Found **${commentList.length}** comment(s) on ${ctx.input.resourceType} **${owner}/${ctx.input.resourceName}** version **${ctx.input.version}**.`
    };
  })
  .build();
