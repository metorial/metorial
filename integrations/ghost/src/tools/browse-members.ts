import { SlateTool } from 'slates';
import { z } from 'zod';
import { GhostAdminClient } from '../lib/client';
import { spec } from '../spec';

let memberSchema = z.object({
  memberId: z.string().describe('Unique member ID'),
  uuid: z.string().describe('Member UUID'),
  email: z.string().describe('Member email address'),
  name: z.string().nullable().describe('Member name'),
  note: z.string().nullable().describe('Internal note about the member'),
  status: z.string().describe('Member status (free, paid, comped)'),
  avatarImage: z.string().nullable().describe('Avatar image URL'),
  emailCount: z.number().describe('Total emails sent to member'),
  emailOpenedCount: z.number().describe('Number of emails opened'),
  emailOpenRate: z.number().nullable().describe('Email open rate percentage'),
  lastSeenAt: z.string().nullable().describe('Last activity timestamp'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp'),
  labels: z
    .array(
      z.object({
        labelId: z.string(),
        name: z.string(),
        slug: z.string()
      })
    )
    .optional()
    .describe('Associated labels'),
  newsletters: z
    .array(
      z.object({
        newsletterId: z.string(),
        name: z.string()
      })
    )
    .optional()
    .describe('Subscribed newsletters')
});

let paginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  pages: z.number(),
  total: z.number(),
  next: z.number().nullable(),
  prev: z.number().nullable()
});

export let browseMembers = SlateTool.create(spec, {
  name: 'Browse Members',
  key: 'browse_members',
  description: `List and search members (subscribers) of your Ghost site. Supports filtering by status, label, newsletter subscription, and more. Include **newsletters** and **labels** for detailed subscription info.`,
  instructions: [
    'Use **filter** with Ghost NQL syntax: `status:free`, `status:paid`, `label:vip`, `subscribed:true`.',
    'Use **include** to embed related data: `newsletters`, `labels`, or `newsletters,labels`.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      filter: z
        .string()
        .optional()
        .describe('Ghost NQL filter expression (e.g., "status:paid", "label:vip")'),
      include: z
        .string()
        .optional()
        .describe('Comma-separated list of related resources (e.g., "newsletters,labels")'),
      limit: z.number().optional().describe('Number of members per page (default 15)'),
      page: z.number().optional().describe('Page number for pagination'),
      order: z.string().optional().describe('Sort order (e.g., "created_at desc")')
    })
  )
  .output(
    z.object({
      members: z.array(memberSchema).describe('List of members'),
      pagination: paginationSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new GhostAdminClient({
      domain: ctx.config.adminDomain,
      apiKey: ctx.auth.token
    });

    let result = await client.browseMembers({
      filter: ctx.input.filter,
      include: ctx.input.include,
      limit: ctx.input.limit,
      page: ctx.input.page,
      order: ctx.input.order
    });

    let members = (result.members ?? []).map((m: any) => ({
      memberId: m.id,
      uuid: m.uuid,
      email: m.email,
      name: m.name ?? null,
      note: m.note ?? null,
      status: m.status,
      avatarImage: m.avatar_image ?? null,
      emailCount: m.email_count ?? 0,
      emailOpenedCount: m.email_opened_count ?? 0,
      emailOpenRate: m.email_open_rate ?? null,
      lastSeenAt: m.last_seen_at ?? null,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
      labels: m.labels?.map((l: any) => ({
        labelId: l.id,
        name: l.name,
        slug: l.slug
      })),
      newsletters: m.newsletters?.map((n: any) => ({
        newsletterId: n.id,
        name: n.name
      }))
    }));

    let pagination = result.meta?.pagination ?? {
      page: 1,
      limit: 15,
      pages: 1,
      total: members.length,
      next: null,
      prev: null
    };

    return {
      output: { members, pagination },
      message: `Found **${pagination.total}** members (page ${pagination.page} of ${pagination.pages}).`
    };
  })
  .build();
