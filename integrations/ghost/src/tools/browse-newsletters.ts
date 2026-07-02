import { SlateTool } from 'slates';
import { z } from 'zod';
import { GhostAdminClient } from '../lib/client';
import { spec } from '../spec';

let newsletterSchema = z.object({
  newsletterId: z.string().describe('Unique newsletter ID'),
  uuid: z.string().describe('Newsletter UUID'),
  name: z.string().describe('Newsletter name'),
  slug: z.string().describe('URL-friendly slug'),
  description: z.string().nullable().describe('Newsletter description'),
  status: z.string().describe('Newsletter status (active or archived)'),
  senderName: z.string().nullable().describe('Displayed sender name'),
  senderEmail: z.string().nullable().describe('Sender email address'),
  senderReplyTo: z.string().describe('Reply-to setting'),
  subscribeOnSignup: z.boolean().describe('Auto-subscribe new members'),
  visibility: z.string().describe('Newsletter visibility'),
  sortOrder: z.number().describe('Sort order'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

let paginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  pages: z.number(),
  total: z.number(),
  next: z.number().nullable(),
  prev: z.number().nullable()
});

export let browseNewsletters = SlateTool.create(spec, {
  name: 'Browse Newsletters',
  key: 'browse_newsletters',
  description: `List newsletters configured on your Ghost site. Ghost supports multiple newsletters, each independently configurable for different audiences or content types.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      filter: z
        .string()
        .optional()
        .describe('Ghost NQL filter expression (e.g., "status:active")'),
      limit: z.number().optional().describe('Number of newsletters per page (default 15)'),
      page: z.number().optional().describe('Page number for pagination'),
      order: z.string().optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      newsletters: z.array(newsletterSchema).describe('List of newsletters'),
      pagination: paginationSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new GhostAdminClient({
      domain: ctx.config.adminDomain,
      apiKey: ctx.auth.token
    });

    let result = await client.browseNewsletters({
      filter: ctx.input.filter,
      limit: ctx.input.limit,
      page: ctx.input.page,
      order: ctx.input.order
    });

    let newsletters = (result.newsletters ?? []).map((n: any) => ({
      newsletterId: n.id,
      uuid: n.uuid,
      name: n.name,
      slug: n.slug,
      description: n.description ?? null,
      status: n.status,
      senderName: n.sender_name ?? null,
      senderEmail: n.sender_email ?? null,
      senderReplyTo: n.sender_reply_to,
      subscribeOnSignup: n.subscribe_on_signup ?? false,
      visibility: n.visibility,
      sortOrder: n.sort_order ?? 0,
      createdAt: n.created_at,
      updatedAt: n.updated_at
    }));

    let pagination = result.meta?.pagination ?? {
      page: 1,
      limit: 15,
      pages: 1,
      total: newsletters.length,
      next: null,
      prev: null
    };

    return {
      output: { newsletters, pagination },
      message: `Found **${pagination.total}** newsletters.`
    };
  })
  .build();
