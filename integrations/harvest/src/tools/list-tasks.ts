import { SlateTool } from 'slates';
import { z } from 'zod';
import { HarvestClient } from '../lib/client';
import { spec } from '../spec';

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `Retrieve task types with optional filtering by active status. Tasks are reusable categories that can be assigned to projects for time tracking.`,
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
      tasks: z.array(
        z.object({
          taskId: z.number().describe('Task ID'),
          name: z.string().describe('Task name'),
          billableByDefault: z.boolean().describe('Whether billable by default'),
          defaultHourlyRate: z.number().nullable().describe('Default hourly rate'),
          isDefault: z.boolean().describe('Whether added to new projects by default'),
          isActive: z.boolean().describe('Whether active'),
          createdAt: z.string().describe('Created timestamp'),
          updatedAt: z.string().describe('Updated timestamp')
        })
      ),
      totalEntries: z.number().describe('Total tasks'),
      totalPages: z.number().describe('Total pages'),
      page: z.number().describe('Current page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HarvestClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let result = await client.listTasks({
      isActive: ctx.input.isActive,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let tasks = result.results.map((t: any) => ({
      taskId: t.id,
      name: t.name,
      billableByDefault: t.billable_by_default,
      defaultHourlyRate: t.default_hourly_rate,
      isDefault: t.is_default,
      isActive: t.is_active,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));

    return {
      output: {
        tasks,
        totalEntries: result.totalEntries,
        totalPages: result.totalPages,
        page: result.page
      },
      message: `Found **${result.totalEntries}** tasks (page ${result.page}/${result.totalPages}).`
    };
  })
  .build();
