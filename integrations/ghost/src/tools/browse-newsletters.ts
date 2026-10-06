import { SlateTool } from 'slates';
import { z } from 'zod';
import { getClient } from '../lib/client';
import { pagination } from '../lib/schemas';
import { spec } from '../spec';

let newsletterSchema = z
  .object({
    newsletterId: z.string().describe('Unique newsletter ID'),
    uuid: z.string().optional().describe('Newsletter UUID'),
    name: z.string().optional().describe('Newsletter name'),
    slug: z.string().optional().describe('URL-friendly slug'),
    description: z.string().nullable().optional().describe('Newsletter description'),
    status: z.string().optional().describe('Newsletter status (active or archived)'),
    senderName: z.string().nullable().optional().describe('Displayed sender name'),
    senderEmail: z.string().nullable().optional().describe('Sender email address'),
    senderReplyTo: z.string().optional().describe('Reply-to setting'),
    subscribeOnSignup: z.boolean().optional().describe('Auto-subscribe new members'),
    visibility: z.string().optional().describe('Newsletter visibility'),
    sortOrder: z.number().optional().describe('Sort order'),
    createdAt: z.string().optional().describe('Creation timestamp'),
    updatedAt: z.string().optional().describe('Last update timestamp')
  })
  .partial()
  .required({ newsletterId: true });

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
    let client = getClient(ctx);

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
      description: n.description,
      status: n.status,
      senderName: n.sender_name,
      senderEmail: n.sender_email,
      senderReplyTo: n.sender_reply_to,
      subscribeOnSignup: n.subscribe_on_signup,
      visibility: n.visibility,
      sortOrder: n.sort_order,
      createdAt: n.created_at,
      updatedAt: n.updated_at
    }));

    let pageInfo = pagination(result, newsletters.length);

    return {
      output: { newsletters, pagination: pageInfo },
      message: `Found **${pageInfo.total}** newsletters.`
    };
  })
  .build();
