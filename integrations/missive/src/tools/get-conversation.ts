import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getConversation = SlateTool.create(spec, {
  name: 'Get Conversation',
  key: 'get_conversation',
  description: `Retrieve a single conversation by its ID, including messages, comments, and posts within it.
Returns full conversation details plus optionally the latest messages, comments, or posts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      conversationId: z.string().describe('The conversation ID to retrieve'),
      includeMessages: z
        .boolean()
        .optional()
        .describe('Also fetch the latest messages in this conversation'),
      includeComments: z
        .boolean()
        .optional()
        .describe('Also fetch the latest comments in this conversation'),
      includePosts: z
        .boolean()
        .optional()
        .describe('Also fetch the latest posts in this conversation')
    })
  )
  .output(
    z.object({
      conversationId: z.string().describe('Conversation ID'),
      subject: z.string().optional().describe('Conversation subject'),
      assignees: z
        .array(
          z.object({
            userId: z.string(),
            name: z.string().optional()
          })
        )
        .optional(),
      teamId: z.string().optional(),
      organizationId: z.string().optional(),
      sharedLabelIds: z.array(z.string()).optional(),
      messagesCount: z.number().optional(),
      lastActivityAt: z.number().optional(),
      webUrl: z.string().optional(),
      appUrl: z.string().optional(),
      messages: z
        .array(
          z.object({
            messageId: z.string(),
            subject: z.string().optional(),
            preview: z.string().optional(),
            body: z.string().optional(),
            fromField: z
              .object({
                address: z.string().optional(),
                name: z.string().optional()
              })
              .optional(),
            toFields: z
              .array(
                z.object({
                  address: z.string().optional(),
                  name: z.string().optional()
                })
              )
              .optional(),
            deliveredAt: z.number().optional()
          })
        )
        .optional(),
      comments: z
        .array(
          z.object({
            commentId: z.string(),
            body: z.string().optional(),
            authorName: z.string().optional(),
            createdAt: z.number().optional()
          })
        )
        .optional(),
      posts: z
        .array(
          z.object({
            postId: z.string(),
            markdown: z.string().optional(),
            text: z.string().optional(),
            createdAt: z.number().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.getConversation(ctx.input.conversationId);
    let c = data.conversations || data;

    let result: any = {
      conversationId: c.id,
      subject: c.subject,
      assignees: c.assignees?.map((a: any) => ({ userId: a.id, name: a.name })),
      teamId: c.team?.id,
      organizationId: c.organization?.id,
      sharedLabelIds: c.shared_labels?.map((l: any) => l.id),
      messagesCount: c.messages_count,
      lastActivityAt: c.last_activity_at,
      webUrl: c.web_url,
      appUrl: c.app_url
    };

    if (ctx.input.includeMessages) {
      let msgData = await client.listConversationMessages(ctx.input.conversationId);
      result.messages = (msgData.messages || []).map((m: any) => ({
        messageId: m.id,
        subject: m.subject,
        preview: m.preview,
        body: m.body,
        fromField: m.from_field
          ? { address: m.from_field.address, name: m.from_field.name }
          : undefined,
        toFields: m.to_fields?.map((f: any) => ({ address: f.address, name: f.name })),
        deliveredAt: m.delivered_at
      }));
    }

    if (ctx.input.includeComments) {
      let commentData = await client.listConversationComments(ctx.input.conversationId);
      result.comments = (commentData.comments || []).map((cm: any) => ({
        commentId: cm.id,
        body: cm.body,
        authorName: cm.author?.name,
        createdAt: cm.created_at
      }));
    }

    if (ctx.input.includePosts) {
      let postData = await client.listConversationPosts(ctx.input.conversationId);
      result.posts = (postData.posts || []).map((p: any) => ({
        postId: p.id,
        markdown: p.markdown,
        text: p.text,
        createdAt: p.created_at
      }));
    }

    return {
      output: result,
      message: `Retrieved conversation **${result.subject || result.conversationId}**.`
    };
  })
  .build();
