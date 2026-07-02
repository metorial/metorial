import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let conversationSchema = z.object({
  conversationId: z.string().describe('Unique conversation ID'),
  subject: z.string().optional().describe('Conversation subject'),
  latestMessageSubject: z.string().optional().describe('Subject of the latest message'),
  latestMessagePreview: z.string().optional().describe('Preview text of the latest message'),
  assignees: z
    .array(
      z.object({
        userId: z.string(),
        name: z.string().optional()
      })
    )
    .optional()
    .describe('Users assigned to this conversation'),
  teamId: z.string().optional().describe('Team ID the conversation belongs to'),
  organizationId: z.string().optional().describe('Organization ID'),
  sharedLabelIds: z.array(z.string()).optional().describe('Shared label IDs applied'),
  messagesCount: z.number().optional().describe('Total message count'),
  lastActivityAt: z.number().optional().describe('Unix timestamp of last activity'),
  webUrl: z.string().optional().describe('URL to view conversation in web app'),
  appUrl: z.string().optional().describe('URL to open conversation in desktop app')
});

export let listConversations = SlateTool.create(spec, {
  name: 'List Conversations',
  key: 'list_conversations',
  description: `Browse conversations across different mailboxes (Inbox, Closed, Snoozed, Starred, Trash, Spam, Drafts).
Filter by team, shared label, organization, contact email, domain, or contact organization.
Use cursor-based pagination with the \`until\` parameter for subsequent pages.`,
  instructions: [
    'Provide exactly one mailbox filter (e.g. inbox, closed, teamInbox) to specify which conversations to retrieve.',
    'For pagination, use the lastActivityAt value from the oldest conversation in the previous page as the "until" cursor.'
  ],
  constraints: [
    'Maximum 50 conversations per request.',
    'Email, domain, and contactOrganization filters are mutually exclusive.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mailbox: z
        .enum([
          'inbox',
          'all',
          'assigned',
          'closed',
          'snoozed',
          'flagged',
          'trashed',
          'junked',
          'drafts'
        ])
        .optional()
        .describe('Personal mailbox filter'),
      teamInbox: z.string().optional().describe('Team inbox ID to filter by'),
      teamClosed: z.string().optional().describe('Team ID to filter closed conversations'),
      teamAll: z.string().optional().describe('Team ID to filter all team conversations'),
      sharedLabelId: z.string().optional().describe('Shared label ID to filter by'),
      organizationId: z.string().optional().describe('Organization ID to filter by'),
      email: z.string().optional().describe('Contact email to filter by'),
      domain: z.string().optional().describe('Domain to filter by'),
      contactOrganization: z.string().optional().describe('Contact organization to filter by'),
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Number of conversations to return (max 50)'),
      until: z
        .number()
        .optional()
        .describe('Cursor: last_activity_at of the oldest conversation from the previous page')
    })
  )
  .output(
    z.object({
      conversations: z.array(conversationSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let params: Record<string, string | number | boolean> = {};

    if (ctx.input.mailbox) {
      params[ctx.input.mailbox] = true;
    }
    if (ctx.input.teamInbox) params.team_inbox = ctx.input.teamInbox;
    if (ctx.input.teamClosed) params.team_closed = ctx.input.teamClosed;
    if (ctx.input.teamAll) params.team_all = ctx.input.teamAll;
    if (ctx.input.sharedLabelId) params.shared_label = ctx.input.sharedLabelId;
    if (ctx.input.organizationId) params.organization = ctx.input.organizationId;
    if (ctx.input.email) params.email = ctx.input.email;
    if (ctx.input.domain) params.domain = ctx.input.domain;
    if (ctx.input.contactOrganization)
      params.contact_organization = ctx.input.contactOrganization;
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.until) params.until = ctx.input.until;

    let data = await client.listConversations(params);
    let conversations = (data.conversations || []).map((c: any) => ({
      conversationId: c.id,
      subject: c.subject,
      latestMessageSubject: c.latest_message?.subject,
      latestMessagePreview: c.latest_message?.preview,
      assignees: c.assignees?.map((a: any) => ({ userId: a.id, name: a.name })),
      teamId: c.team?.id,
      organizationId: c.organization?.id,
      sharedLabelIds: c.shared_labels?.map((l: any) => l.id),
      messagesCount: c.messages_count,
      lastActivityAt: c.last_activity_at,
      webUrl: c.web_url,
      appUrl: c.app_url
    }));

    return {
      output: { conversations },
      message: `Retrieved **${conversations.length}** conversations.`
    };
  })
  .build();
