import { SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List and filter contacts in your Gist workspace. Supports filtering by status, tag, segment, campaign, form, and email pattern. Results are paginated.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 50, max: 60)'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      orderBy: z
        .enum(['created_at', 'updated_at', 'last_seen_at', 'signed_up_at'])
        .optional()
        .describe('Sort field'),
      status: z
        .enum(['active', 'unsubscribed', 'bounced'])
        .optional()
        .describe('Filter by subscription status'),
      tagId: z.string().optional().describe('Filter by tag ID'),
      segmentId: z.string().optional().describe('Filter by segment ID'),
      campaignId: z.string().optional().describe('Filter by campaign ID'),
      formId: z.string().optional().describe('Filter by form ID'),
      emailLike: z.string().optional().describe('Filter by email pattern (partial match)'),
      createdSince: z
        .string()
        .optional()
        .describe('Filter contacts created after this UNIX timestamp')
    })
  )
  .output(
    z.object({
      contacts: z.array(
        z.object({
          contactId: z.string(),
          type: z.string().optional(),
          name: z.string().optional(),
          email: z.string().optional(),
          userId: z.string().optional(),
          createdAt: z.string().optional(),
          lastSeenAt: z.string().optional(),
          tags: z.array(z.any()).optional()
        })
      ),
      pages: z.any().optional().describe('Pagination info with prev/next/first/last URLs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GistClient({ token: ctx.auth.token });

    let data = await client.listContacts({
      page: ctx.input.page,
      per_page: ctx.input.perPage,
      order: ctx.input.order,
      order_by: ctx.input.orderBy,
      status: ctx.input.status,
      tag_id: ctx.input.tagId,
      segment_id: ctx.input.segmentId,
      campaign_id: ctx.input.campaignId,
      form_id: ctx.input.formId,
      email_like: ctx.input.emailLike,
      created_since: ctx.input.createdSince
    });

    let contacts = (data.contacts || []).map((c: any) => ({
      contactId: String(c.id),
      type: c.type,
      name: c.name,
      email: c.email,
      userId: c.user_id ? String(c.user_id) : undefined,
      createdAt: c.created_at ? String(c.created_at) : undefined,
      lastSeenAt: c.last_seen_at ? String(c.last_seen_at) : undefined,
      tags: c.tags
    }));

    return {
      output: {
        contacts,
        pages: data.pages
      },
      message: `Found **${contacts.length}** contacts.`
    };
  })
  .build();
