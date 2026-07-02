import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let planningEntryOutputSchema = z.object({
  entryId: z.number().describe('Planning entry ID'),
  hoursPerDay: z.number().optional().describe('Planned hours per day'),
  startsOn: z.string().optional().describe('Planning start date'),
  endsOn: z.string().optional().describe('Planning end date'),
  user: z.any().optional().describe('Assigned user details'),
  project: z.any().optional().describe('Associated project details'),
  deal: z.any().optional().describe('Associated deal details'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let mapEntry = (e: any) => ({
  entryId: e.id,
  hoursPerDay: e.hours_per_day,
  startsOn: e.starts_on,
  endsOn: e.ends_on,
  user: e.user,
  project: e.project,
  deal: e.deal,
  createdAt: e.created_at,
  updatedAt: e.updated_at
});

export let listPlanningEntries = SlateTool.create(spec, {
  name: 'List Planning Entries',
  key: 'list_planning_entries',
  description: `Retrieve resource planning entries. A period filter is required. Optionally filter by user, project, or deal.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      period: z.string().describe('Planning period (e.g., "2024-01" for January 2024)'),
      userId: z.number().optional().describe('Filter by user ID'),
      projectId: z.number().optional().describe('Filter by project ID'),
      dealId: z.number().optional().describe('Filter by deal ID')
    })
  )
  .output(
    z.object({
      entries: z.array(planningEntryOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    let params: Record<string, any> = { period: ctx.input.period };
    if (ctx.input.userId) params.user_id = ctx.input.userId;
    if (ctx.input.projectId) params.project_id = ctx.input.projectId;
    if (ctx.input.dealId) params.deal_id = ctx.input.dealId;

    let data = await client.listPlanningEntries(params);
    let entries = (data as any[]).map(mapEntry);

    return {
      output: { entries },
      message: `Found **${entries.length}** planning entries.`
    };
  })
  .build();

export let createPlanningEntry = SlateTool.create(spec, {
  name: 'Create Planning Entry',
  key: 'create_planning_entry',
  description: `Create a new resource planning entry to schedule a team member on a project or deal for a time period.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      startsOn: z.string().describe('Planning start date (YYYY-MM-DD)'),
      endsOn: z.string().describe('Planning end date (YYYY-MM-DD)'),
      hoursPerDay: z.number().describe('Planned hours per day'),
      userId: z.number().optional().describe('User ID to schedule'),
      projectId: z.number().optional().describe('Project ID (required if no dealId)'),
      dealId: z.number().optional().describe('Deal ID (required if no projectId)'),
      comment: z.string().optional().describe('Planning entry comment')
    })
  )
  .output(planningEntryOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    let data: Record<string, any> = {
      starts_on: ctx.input.startsOn,
      ends_on: ctx.input.endsOn,
      hours_per_day: ctx.input.hoursPerDay
    };

    if (ctx.input.userId) data.user_id = ctx.input.userId;
    if (ctx.input.projectId) data.project_id = ctx.input.projectId;
    if (ctx.input.dealId) data.deal_id = ctx.input.dealId;
    if (ctx.input.comment) data.comment = ctx.input.comment;

    let e = await client.createPlanningEntry(data);

    return {
      output: mapEntry(e),
      message: `Created planning entry (ID: ${e.id}) from ${e.starts_on} to ${e.ends_on}.`
    };
  })
  .build();

export let updatePlanningEntry = SlateTool.create(spec, {
  name: 'Update Planning Entry',
  key: 'update_planning_entry',
  description: `Update an existing resource planning entry.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      entryId: z.number().describe('The planning entry ID to update'),
      startsOn: z.string().optional().describe('New start date (YYYY-MM-DD)'),
      endsOn: z.string().optional().describe('New end date (YYYY-MM-DD)'),
      hoursPerDay: z.number().optional().describe('New hours per day'),
      comment: z.string().optional().describe('Updated comment')
    })
  )
  .output(planningEntryOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    let data: Record<string, any> = {};
    if (ctx.input.startsOn) data.starts_on = ctx.input.startsOn;
    if (ctx.input.endsOn) data.ends_on = ctx.input.endsOn;
    if (ctx.input.hoursPerDay !== undefined) data.hours_per_day = ctx.input.hoursPerDay;
    if (ctx.input.comment !== undefined) data.comment = ctx.input.comment;

    let e = await client.updatePlanningEntry(ctx.input.entryId, data);

    return {
      output: mapEntry(e),
      message: `Updated planning entry **${e.id}**.`
    };
  })
  .build();

export let deletePlanningEntry = SlateTool.create(spec, {
  name: 'Delete Planning Entry',
  key: 'delete_planning_entry',
  description: `Delete a resource planning entry.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      entryId: z.number().describe('The planning entry ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });
    await client.deletePlanningEntry(ctx.input.entryId);

    return {
      output: { success: true },
      message: `Deleted planning entry **${ctx.input.entryId}**.`
    };
  })
  .build();
