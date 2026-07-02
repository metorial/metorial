import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List all users in the Aircall account with their availability status, assigned numbers, and role information. Supports pagination and time-based filtering.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      from: z.number().optional().describe('Start of time range as UNIX timestamp'),
      to: z.number().optional().describe('End of time range as UNIX timestamp'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (max: 50, default: 20)')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.number().describe('Unique user identifier'),
          name: z.string().describe('Full name of the user'),
          email: z.string().describe('Email address'),
          available: z.boolean().describe('Whether the user is available'),
          availabilityStatus: z
            .string()
            .nullable()
            .describe('Availability status (available, custom, unavailable)'),
          timeZone: z.string().nullable().describe('User timezone'),
          language: z.string().nullable().describe('User language'),
          wrapUpTime: z.number().nullable().describe('Wrap-up time in seconds'),
          createdAt: z.string().describe('Creation date as ISO string')
        })
      ),
      totalCount: z.number().describe('Total number of users'),
      currentPage: z.number().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let result = await client.listUsers({
      from: ctx.input.from,
      to: ctx.input.to,
      order: ctx.input.order,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let users = result.items.map((user: any) => ({
      userId: user.id,
      name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      email: user.email,
      available: user.available ?? false,
      availabilityStatus: user.availability_status ?? null,
      timeZone: user.time_zone ?? null,
      language: user.language ?? null,
      wrapUpTime: user.wrap_up_time ?? null,
      createdAt: user.created_at
        ? new Date(user.created_at * 1000).toISOString()
        : new Date().toISOString()
    }));

    return {
      output: {
        users,
        totalCount: result.meta.total,
        currentPage: result.meta.currentPage
      },
      message: `Found **${result.meta.total}** users (showing page ${result.meta.currentPage}, ${users.length} results).`
    };
  })
  .build();
