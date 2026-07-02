import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listProjectsTool = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List projects with filtering by status and customer.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      customerId: z.string().optional(),
      status: z.enum(['active', 'inactive']).optional(),
      searchText: z.string().optional(),
      page: z.number().optional().default(1),
      perPage: z.number().optional().default(200)
    })
  )
  .output(
    z.object({
      projects: z.array(
        z.object({
          projectId: z.string(),
          projectName: z.string().optional(),
          customerName: z.string().optional(),
          customerId: z.string().optional(),
          status: z.string().optional(),
          billingType: z.string().optional(),
          rate: z.number().optional(),
          budget: z.number().optional(),
          totalHours: z.string().optional(),
          billableHours: z.string().optional(),
          createdTime: z.string().optional()
        })
      ),
      pageContext: z
        .object({
          page: z.number(),
          perPage: z.number(),
          hasMorePage: z.boolean()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let query: Record<string, any> = { page: ctx.input.page, per_page: ctx.input.perPage };
    if (ctx.input.customerId) query.customer_id = ctx.input.customerId;
    if (ctx.input.status)
      query.filter_by = ctx.input.status === 'active' ? 'Status.Active' : 'Status.Inactive';
    if (ctx.input.searchText) query.search_text = ctx.input.searchText;

    let resp = await client.listProjects(query);
    let projects = (resp.projects || []).map((p: any) => ({
      projectId: p.project_id,
      projectName: p.project_name,
      customerName: p.customer_name,
      customerId: p.customer_id,
      status: p.status,
      billingType: p.billing_type,
      rate: p.rate,
      budget: p.budget,
      totalHours: p.total_hours,
      billableHours: p.billable_hours,
      createdTime: p.created_time
    }));

    let pageContext = resp.page_context
      ? {
          page: resp.page_context.page,
          perPage: resp.page_context.per_page,
          hasMorePage: resp.page_context.has_more_page
        }
      : undefined;

    return {
      output: { projects, pageContext },
      message: `Found **${projects.length}** project(s).`
    };
  })
  .build();

export let createProjectTool = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new project linked to a customer. Configure billing type, budget, and assign users.`
})
  .input(
    z.object({
      projectName: z.string().describe('Name of the project'),
      customerId: z.string().describe('Customer ID to link the project to'),
      billingType: z
        .enum([
          'fixed_cost_for_project',
          'based_on_project_hours',
          'based_on_staff_hours',
          'based_on_task_hours'
        ])
        .optional()
        .default('based_on_staff_hours'),
      rate: z.number().optional().describe('Hourly rate or fixed cost'),
      budget: z.number().optional().describe('Project budget amount or hours'),
      budgetType: z
        .enum([
          'total_project_cost',
          'total_project_hours',
          'hours_per_task',
          'hours_per_staff'
        ])
        .optional(),
      description: z.string().optional(),
      users: z
        .array(
          z.object({
            userId: z.string(),
            rate: z.number().optional()
          })
        )
        .optional()
        .describe('Users to assign to the project')
    })
  )
  .output(
    z.object({
      projectId: z.string(),
      projectName: z.string().optional(),
      status: z.string().optional(),
      billingType: z.string().optional(),
      createdTime: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let input = ctx.input;

    let payload: Record<string, any> = {
      project_name: input.projectName,
      customer_id: input.customerId
    };

    if (input.billingType) payload.billing_type = input.billingType;
    if (input.rate !== undefined) payload.rate = input.rate;
    if (input.budget !== undefined) payload.budget = input.budget;
    if (input.budgetType) payload.budget_type = input.budgetType;
    if (input.description) payload.description = input.description;
    if (input.users) {
      payload.users = input.users.map(u => ({
        user_id: u.userId,
        rate: u.rate
      }));
    }

    let resp = await client.createProject(payload);
    let proj = resp.project;

    return {
      output: {
        projectId: proj.project_id,
        projectName: proj.project_name,
        status: proj.status,
        billingType: proj.billing_type,
        createdTime: proj.created_time
      },
      message: `Created project **${proj.project_name}**.`
    };
  })
  .build();

export let logTimeEntryTool = SlateTool.create(spec, {
  name: 'Log Time Entry',
  key: 'log_time_entry',
  description: `Log a time entry against a project for time tracking and billing. Supports manual duration or start/stop timer.`,
  instructions: [
    'Provide projectId, taskId, userId, and logTime in HH:MM format.',
    'Use timerAction to start or stop a timer on an existing time entry.'
  ]
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      taskId: z.string().describe('ID of the task within the project'),
      userId: z.string().describe('ID of the user logging time'),
      logDate: z.string().optional().describe('Date for the time entry (YYYY-MM-DD)'),
      logTime: z.string().optional().describe('Duration in HH:MM format (e.g. "02:30")'),
      notes: z.string().optional(),
      isBillable: z.boolean().optional().default(true),
      timerAction: z
        .enum(['start', 'stop'])
        .optional()
        .describe('Start or stop a timer (requires existing timeEntryId)'),
      timeEntryId: z.string().optional().describe('Required for timer actions')
    })
  )
  .output(
    z.object({
      timeEntryId: z.string(),
      projectId: z.string().optional(),
      taskName: z.string().optional(),
      logDate: z.string().optional(),
      logTime: z.string().optional(),
      isBillable: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let input = ctx.input;

    if (input.timerAction && input.timeEntryId) {
      if (input.timerAction === 'start') await client.startTimer(input.timeEntryId);
      else if (input.timerAction === 'stop') await client.stopTimer(input.timeEntryId);

      let resp = await client.getTimeEntry(input.timeEntryId);
      let te = resp.time_entry;
      return {
        output: {
          timeEntryId: te.time_entry_id,
          projectId: te.project_id,
          taskName: te.task_name,
          logDate: te.log_date,
          logTime: te.log_time,
          isBillable: te.is_billable
        },
        message: `Timer ${input.timerAction === 'start' ? 'started' : 'stopped'} for time entry **${te.time_entry_id}**.`
      };
    }

    let payload: Record<string, any> = {
      project_id: input.projectId,
      task_id: input.taskId,
      user_id: input.userId
    };

    if (input.logDate) payload.log_date = input.logDate;
    if (input.logTime) payload.log_time = input.logTime;
    if (input.notes) payload.notes = input.notes;
    if (input.isBillable !== undefined) payload.is_billable = input.isBillable;

    let resp = await client.logTimeEntry(payload);
    let te = resp.time_entry;

    return {
      output: {
        timeEntryId: te.time_entry_id,
        projectId: te.project_id,
        taskName: te.task_name,
        logDate: te.log_date,
        logTime: te.log_time,
        isBillable: te.is_billable
      },
      message: `Logged time entry of **${te.log_time}** on ${te.log_date}.`
    };
  })
  .build();
