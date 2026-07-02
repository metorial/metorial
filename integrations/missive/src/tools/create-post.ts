import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let postAttachmentFieldSchema = z.object({
  title: z.string().describe('Field title/label'),
  value: z.string().describe('Field value'),
  short: z.boolean().optional().describe('Display as short field (two per row) when true')
});

let postAttachmentSchema = z.object({
  authorName: z.string().optional().describe('Author display name'),
  authorLink: z.string().optional().describe('Author URL'),
  authorIcon: z.string().optional().describe('Author avatar URL'),
  color: z.string().optional().describe('Hex color or "good", "warning", "danger"'),
  text: z.string().optional().describe('Attachment body text'),
  timestamp: z.number().optional().describe('Unix timestamp'),
  fields: z.array(postAttachmentFieldSchema).optional().describe('Structured key/value fields')
});

export let createPost = SlateTool.create(spec, {
  name: 'Create Post',
  key: 'create_post',
  description: `Inject rich content into a conversation from external systems (e.g., GitHub commits, Stripe transactions).
Posts support Markdown, structured attachments with fields, colors, and images.
Posts are the recommended way to manage conversation state from integrations because they leave a visible trace of the action.
Also supports conversation actions like closing, labeling, and assigning.`,
  instructions: [
    'Provide at least one of: text, markdown, or attachments.',
    'Use conversationId to post into an existing conversation, or references to match/create one.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      text: z.string().optional().describe('Plain text content'),
      markdown: z.string().optional().describe('Markdown formatted content'),
      attachments: z
        .array(postAttachmentSchema)
        .optional()
        .describe('Rich attachment objects'),
      username: z.string().optional().describe('Display name for the post author'),
      usernameIcon: z.string().optional().describe('URL for the post author avatar'),
      notificationTitle: z.string().optional().describe('Push notification title'),
      notificationBody: z.string().optional().describe('Push notification body'),
      conversationId: z.string().optional().describe('Existing conversation ID'),
      references: z
        .array(z.string())
        .optional()
        .describe('Reference strings for conversation matching'),
      teamId: z.string().optional().describe('Team ID'),
      forceTeam: z.boolean().optional().describe('Force team reassignment'),
      organizationId: z.string().optional().describe('Organization ID'),
      addUsers: z
        .array(z.string())
        .optional()
        .describe('User IDs to grant conversation access'),
      addAssignees: z.array(z.string()).optional().describe('User IDs to assign'),
      addSharedLabels: z.array(z.string()).optional().describe('Shared label IDs to add'),
      removeSharedLabels: z
        .array(z.string())
        .optional()
        .describe('Shared label IDs to remove'),
      addToInbox: z.boolean().optional().describe('Move to inbox'),
      addToTeamInbox: z.boolean().optional().describe('Move to team inbox'),
      close: z.boolean().optional().describe('Close the conversation'),
      conversationSubject: z.string().optional().describe('Subject for new conversation'),
      conversationColor: z.string().optional().describe('Hex color for conversation')
    })
  )
  .output(
    z.object({
      postId: z.string().optional().describe('Created post ID'),
      conversationId: z.string().optional().describe('Conversation ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let post: Record<string, any> = {};

    if (ctx.input.text) post.text = ctx.input.text;
    if (ctx.input.markdown) post.markdown = ctx.input.markdown;
    if (ctx.input.attachments) {
      post.attachments = ctx.input.attachments.map(a => ({
        author_name: a.authorName,
        author_link: a.authorLink,
        author_icon: a.authorIcon,
        color: a.color,
        text: a.text,
        timestamp: a.timestamp,
        fields: a.fields?.map(f => ({ title: f.title, value: f.value, short: f.short }))
      }));
    }
    if (ctx.input.username) post.username = ctx.input.username;
    if (ctx.input.usernameIcon) post.username_icon = ctx.input.usernameIcon;
    if (ctx.input.notificationTitle || ctx.input.notificationBody) {
      post.notification = {};
      if (ctx.input.notificationTitle) post.notification.title = ctx.input.notificationTitle;
      if (ctx.input.notificationBody) post.notification.body = ctx.input.notificationBody;
    }
    if (ctx.input.conversationId) post.conversation = ctx.input.conversationId;
    if (ctx.input.references) post.references = ctx.input.references;
    if (ctx.input.teamId) post.team = ctx.input.teamId;
    if (ctx.input.forceTeam !== undefined) post.force_team = ctx.input.forceTeam;
    if (ctx.input.organizationId) post.organization = ctx.input.organizationId;
    if (ctx.input.addUsers) post.add_users = ctx.input.addUsers;
    if (ctx.input.addAssignees) post.add_assignees = ctx.input.addAssignees;
    if (ctx.input.addSharedLabels) post.add_shared_labels = ctx.input.addSharedLabels;
    if (ctx.input.removeSharedLabels) post.remove_shared_labels = ctx.input.removeSharedLabels;
    if (ctx.input.addToInbox !== undefined) post.add_to_inbox = ctx.input.addToInbox;
    if (ctx.input.addToTeamInbox !== undefined)
      post.add_to_team_inbox = ctx.input.addToTeamInbox;
    if (ctx.input.close !== undefined) post.close = ctx.input.close;
    if (ctx.input.conversationSubject)
      post.conversation_subject = ctx.input.conversationSubject;
    if (ctx.input.conversationColor) post.conversation_color = ctx.input.conversationColor;

    let data = await client.createPost(post);

    return {
      output: {
        postId: data.posts?.id,
        conversationId: data.conversations?.[0]?.id
      },
      message: `Created post${data.conversations?.[0]?.id ? ` in conversation **${data.conversations[0].id}**` : ''}.`
    };
  })
  .build();
