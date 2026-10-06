import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapUser } from '../lib/contracts';
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
          available: z.boolean().optional().describe('Whether the user is available'),
          availabilityStatus: z
            .string()
            .nullable()
            .describe('Availability status (available, custom, unavailable)'),
          timeZone: z.string().nullable().describe('User timezone'),
          language: z.string().nullable().describe('User language'),
          wrapUpTime: z.number().nullable().describe('Wrap-up time in seconds'),
          createdAt: z.string().optional().describe('Creation date as ISO string')
        })
      ),
      perPage: z.number().optional(),
      nextPageLink: z.string().nullable().optional(),
      previousPageLink: z.string().nullable().optional(),
      collectionLimit: z.number().optional(),
      historyWindowMonths: z.number().optional(),
      totalCount: z.number().describe('Total number of users'),
      currentPage: z.number().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client(ctx.auth).listUsers(ctx.input);
    return {
      output: {
        users: result.items.map(mapUser),
        totalCount: result.meta.total,
        currentPage: result.meta.currentPage,
        perPage: result.meta.perPage,
        nextPageLink: result.meta.nextPageLink
      },
      message: `Retrieved ${result.items.length} users from native page ${result.meta.currentPage}.`
    };
  })
  .build();
