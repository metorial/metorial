import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZendeskClient } from '../lib/client';
import { spec } from '../spec';

export let listViews = SlateTool.create(spec, {
  name: 'List Views',
  key: 'list_views',
  description: `Lists saved ticket views in Zendesk. Views are pre-defined ticket filters that agents use to organize and manage their ticket queues. Can also retrieve tickets within a specific view.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      viewId: z
        .string()
        .optional()
        .describe('If provided, returns tickets in this view instead of listing views'),
      page: z.number().optional().default(1).describe('Page number'),
      perPage: z.number().optional().default(25).describe('Results per page')
    })
  )
  .output(
    z.object({
      views: z
        .array(
          z.object({
            viewId: z.string(),
            title: z.string(),
            active: z.boolean(),
            position: z.number().nullable(),
            createdAt: z.string(),
            updatedAt: z.string()
          })
        )
        .optional()
        .describe('List of views (when no viewId is provided)'),
      tickets: z
        .array(
          z.object({
            ticketId: z.string(),
            subject: z.string().nullable(),
            status: z.string(),
            priority: z.string().nullable(),
            requesterId: z.string().nullable(),
            assigneeId: z.string().nullable(),
            updatedAt: z.string()
          })
        )
        .optional()
        .describe('Tickets in the view (when viewId is provided)'),
      count: z.number(),
      nextPage: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZendeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    if (ctx.input.viewId) {
      let data = await client.getViewTickets(ctx.input.viewId, {
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });

      let tickets = (data.tickets || []).map((t: any) => ({
        ticketId: String(t.id),
        subject: t.subject || null,
        status: t.status,
        priority: t.priority || null,
        requesterId: t.requester_id ? String(t.requester_id) : null,
        assigneeId: t.assignee_id ? String(t.assignee_id) : null,
        updatedAt: t.updated_at
      }));

      return {
        output: {
          tickets,
          count: data.count || tickets.length,
          nextPage: data.next_page || null
        },
        message: `Found ${data.count || tickets.length} ticket(s) in view #${ctx.input.viewId}`
      };
    }

    let data = await client.listViews({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let views = (data.views || []).map((v: any) => ({
      viewId: String(v.id),
      title: v.title,
      active: v.active,
      position: v.position ?? null,
      createdAt: v.created_at,
      updatedAt: v.updated_at
    }));

    return {
      output: {
        views,
        count: data.count || views.length,
        nextPage: data.next_page || null
      },
      message: `Found ${data.count || views.length} view(s)`
    };
  })
  .build();
