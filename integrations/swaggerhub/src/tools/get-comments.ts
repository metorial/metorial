import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let commentSchema = z.object({
  commentId: z.string().optional().describe('Unique comment identifier'),
  body: z.string().optional().describe('Comment text'),
  createdBy: z.string().optional().describe('User who created the comment'),
  created: z.string().optional().describe('Creation timestamp'),
  modified: z.string().optional().describe('Last modification timestamp'),
  position: z.number().optional().describe('Line position in the spec'),
  status: z.string().optional().describe('Comment status (OPEN, RESOLVED)'),
  replies: z
    .array(
      z.object({
        replyId: z.string().optional().describe('Reply identifier'),
        body: z.string().optional().describe('Reply text'),
        createdBy: z.string().optional().describe('User who created the reply'),
        created: z.string().optional().describe('Creation timestamp'),
        modified: z.string().optional().describe('Last modification timestamp')
      })
    )
    .optional()
    .describe('Replies to this comment')
});

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
      throw new Error(
        'Owner is required. Provide it in the input or configure a default owner.'
      );

    let comments: unknown[];
    if (ctx.input.resourceType === 'api') {
      comments =
        (await client.getApiComments(owner, ctx.input.resourceName, ctx.input.version)) ?? [];
    } else {
      comments =
        (await client.getDomainComments(owner, ctx.input.resourceName, ctx.input.version)) ??
        [];
    }

    let commentList: any[] = Array.isArray(comments) ? comments : [];

    return {
      output: {
        comments: commentList,
        totalCount: commentList.length
      },
      message: `Found **${commentList.length}** comment(s) on ${ctx.input.resourceType} **${owner}/${ctx.input.resourceName}** version **${ctx.input.version}**.`
    };
  })
  .build();
