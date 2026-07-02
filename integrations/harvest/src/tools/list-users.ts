import { SlateTool } from 'slates';
import { z } from 'zod';
import { HarvestClient } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve users with optional filtering by active status. Includes the authenticated user's own information. Returns user details including roles, rates, and access levels.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      isActive: z.boolean().optional().describe('Filter by active status'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page (max 2000)')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.number().describe('User ID'),
          firstName: z.string().describe('First name'),
          lastName: z.string().describe('Last name'),
          email: z.string().describe('Email'),
          isActive: z.boolean().describe('Whether active'),
          isAdmin: z.boolean().describe('Whether administrator'),
          isProjectManager: z.boolean().describe('Whether project manager'),
          timezone: z.string().describe('Timezone'),
          defaultHourlyRate: z.number().nullable().describe('Default hourly rate'),
          weeklyCapacity: z.number().describe('Weekly capacity in seconds')
        })
      ),
      totalEntries: z.number().describe('Total users'),
      totalPages: z.number().describe('Total pages'),
      page: z.number().describe('Current page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HarvestClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let result = await client.listUsers({
      isActive: ctx.input.isActive,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let users = result.results.map((u: any) => ({
      userId: u.id,
      firstName: u.first_name,
      lastName: u.last_name,
      email: u.email,
      isActive: u.is_active,
      isAdmin: u.is_admin,
      isProjectManager: u.is_project_manager,
      timezone: u.timezone,
      defaultHourlyRate: u.default_hourly_rate,
      weeklyCapacity: u.weekly_capacity
    }));

    return {
      output: {
        users,
        totalEntries: result.totalEntries,
        totalPages: result.totalPages,
        page: result.page
      },
      message: `Found **${result.totalEntries}** users (page ${result.page}/${result.totalPages}).`
    };
  })
  .build();
