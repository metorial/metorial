import { SlateTool } from 'slates';
import { z } from 'zod';
import { harvestAccountIdSchema, resolveHarvestAccountId } from '../lib/account-id';
import { HarvestClient } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve users with optional filtering by active status. Use get_current_user for your own profile without requiring team-management permissions. Returns user details including roles, rates, and access levels. Call list_accounts to discover account IDs when choosing between multiple accounts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: harvestAccountIdSchema,
      isActive: z.boolean().optional().describe('Filter by active status'),
      cursor: z
        .string()
        .optional()
        .describe('Cursor returned as nextCursor by the previous call'),
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
      nextCursor: z.string().nullable().describe('Pass this cursor to retrieve the next page'),
      pageNumberKnown: z
        .boolean()
        .describe('Whether the API returned a page number; cursor responses may omit it'),
      page: z.number().describe('Page number; 1 when pageNumberKnown is false')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HarvestClient({
      token: ctx.auth.token,
      accountId: resolveHarvestAccountId(ctx)
    });

    let result = await client.listUsers({
      isActive: ctx.input.isActive,
      cursor: ctx.input.cursor,
      page: ctx.input.cursor ? undefined : ctx.input.page,
      perPage: ctx.input.perPage
    });

    let users = result.results.map((u: any) => ({
      userId: u.id,
      firstName: u.first_name,
      lastName: u.last_name,
      email: u.email,
      isActive: u.is_active,
      isAdmin: u.is_admin ?? u.access_roles?.includes('administrator') ?? false,
      isProjectManager:
        u.is_project_manager ??
        u.access_roles?.some((role: string) =>
          ['manager', 'project_manager'].includes(role)
        ) ??
        false,
      timezone: u.timezone,
      defaultHourlyRate: u.default_hourly_rate ?? null,
      weeklyCapacity: u.weekly_capacity
    }));

    return {
      output: {
        users,
        totalEntries: result.totalEntries,
        totalPages: result.totalPages,
        nextCursor: result.nextCursor,
        pageNumberKnown: result.pageNumberKnown,
        page: result.page
      },
      message: `Found **${result.totalEntries}** users${result.pageNumberKnown ? ` (page ${result.page}/${result.totalPages})` : ' (cursor page)'}.`
    };
  })
  .build();
