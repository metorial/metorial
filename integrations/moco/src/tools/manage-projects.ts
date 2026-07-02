import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let projectOutputSchema = z.object({
  projectId: z.number().describe('Project ID'),
  name: z.string().describe('Project name'),
  identifier: z.string().optional().describe('Project identifier/code'),
  active: z.boolean().optional().describe('Whether the project is active'),
  billable: z.boolean().optional().describe('Whether the project is billable'),
  fixedPrice: z.boolean().optional().describe('Whether this is a fixed-price project'),
  retainer: z.boolean().optional().describe('Whether this is a retainer project'),
  startDate: z.string().optional().describe('Project start date'),
  finishDate: z.string().optional().describe('Project finish date'),
  currency: z.string().optional().describe('Currency code'),
  budgetTotal: z.number().optional().describe('Total budget'),
  budgetMonthly: z.number().optional().describe('Monthly budget for retainers'),
  tags: z.array(z.string()).optional().describe('Project tags'),
  leader: z.any().optional().describe('Project leader details'),
  customer: z.any().optional().describe('Customer company details'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `Retrieve a list of projects from MOCO. Supports filtering by company, leader, tags, date range, and more. Returns project details including budgets, billing config, and assignments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeArchived: z.boolean().optional().describe('Include archived projects'),
      companyId: z.number().optional().describe('Filter by customer company ID'),
      leaderId: z.number().optional().describe('Filter by project leader user ID'),
      tags: z.string().optional().describe('Comma-separated list of tags to filter by'),
      identifier: z.string().optional().describe('Filter by project identifier'),
      retainer: z.boolean().optional().describe('Filter by retainer status'),
      createdFrom: z
        .string()
        .optional()
        .describe('Filter projects created from this date (YYYY-MM-DD)'),
      createdTo: z
        .string()
        .optional()
        .describe('Filter projects created until this date (YYYY-MM-DD)'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Filter by last updated timestamp (ISO 8601)')
    })
  )
  .output(
    z.object({
      projects: z.array(projectOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    let params: Record<string, any> = {};
    if (ctx.input.includeArchived) params.include_archived = ctx.input.includeArchived;
    if (ctx.input.companyId) params.company_id = ctx.input.companyId;
    if (ctx.input.leaderId) params.leader_id = ctx.input.leaderId;
    if (ctx.input.tags) params.tags = ctx.input.tags;
    if (ctx.input.identifier) params.identifier = ctx.input.identifier;
    if (ctx.input.retainer !== undefined) params.retainer = ctx.input.retainer;
    if (ctx.input.createdFrom) params.created_from = ctx.input.createdFrom;
    if (ctx.input.createdTo) params.created_to = ctx.input.createdTo;
    if (ctx.input.updatedAfter) params.updated_after = ctx.input.updatedAfter;

    let data = await client.listProjects(params);

    let projects = (data as any[]).map((p: any) => ({
      projectId: p.id,
      name: p.name,
      identifier: p.identifier,
      active: p.active,
      billable: p.billable,
      fixedPrice: p.fixed_price,
      retainer: p.retainer,
      startDate: p.start_date,
      finishDate: p.finish_date,
      currency: p.currency,
      budgetTotal: p.budget,
      budgetMonthly: p.budget_monthly,
      tags: p.tags,
      leader: p.leader,
      customer: p.customer,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }));

    return {
      output: { projects },
      message: `Found **${projects.length}** projects.`
    };
  })
  .build();

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieve detailed information about a specific project, including its budget, billing configuration, tasks, and assignments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('The ID of the project to retrieve')
    })
  )
  .output(projectOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });
    let p = await client.getProject(ctx.input.projectId);

    return {
      output: {
        projectId: p.id,
        name: p.name,
        identifier: p.identifier,
        active: p.active,
        billable: p.billable,
        fixedPrice: p.fixed_price,
        retainer: p.retainer,
        startDate: p.start_date,
        finishDate: p.finish_date,
        currency: p.currency,
        budgetTotal: p.budget,
        budgetMonthly: p.budget_monthly,
        tags: p.tags,
        leader: p.leader,
        customer: p.customer,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      },
      message: `Retrieved project **${p.name}** (ID: ${p.id}).`
    };
  })
  .build();

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new project in MOCO. Requires project name, currency, dates, and customer assignment. Optionally configure billing, budgets, and tags.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Project name'),
      currency: z.string().describe('Currency code (e.g., "EUR", "USD")'),
      startDate: z.string().describe('Project start date (YYYY-MM-DD)'),
      finishDate: z.string().describe('Project end date (YYYY-MM-DD)'),
      fixedPrice: z.boolean().describe('Whether this is a fixed-price project'),
      retainer: z.boolean().optional().describe('Whether this is a retainer project'),
      leaderId: z.number().describe('User ID of the project leader'),
      customerId: z.number().describe('Company ID of the customer'),
      identifier: z.string().optional().describe('Project identifier/code'),
      billable: z.boolean().optional().describe('Whether the project is billable'),
      budgetTotal: z.number().optional().describe('Total project budget'),
      budgetMonthly: z.number().optional().describe('Monthly budget (for retainer projects)'),
      hourlyRate: z.number().optional().describe('Default hourly rate'),
      tags: z.array(z.string()).optional().describe('Project tags'),
      info: z.string().optional().describe('Additional project information/notes')
    })
  )
  .output(projectOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    let data: Record<string, any> = {
      name: ctx.input.name,
      currency: ctx.input.currency,
      start_date: ctx.input.startDate,
      finish_date: ctx.input.finishDate,
      fixed_price: ctx.input.fixedPrice,
      leader_id: ctx.input.leaderId,
      customer_id: ctx.input.customerId
    };

    if (ctx.input.retainer !== undefined) data.retainer = ctx.input.retainer;
    if (ctx.input.identifier) data.identifier = ctx.input.identifier;
    if (ctx.input.billable !== undefined) data.billable = ctx.input.billable;
    if (ctx.input.budgetTotal !== undefined) data.budget = ctx.input.budgetTotal;
    if (ctx.input.budgetMonthly !== undefined) data.budget_monthly = ctx.input.budgetMonthly;
    if (ctx.input.hourlyRate !== undefined) data.hourly_rate = ctx.input.hourlyRate;
    if (ctx.input.tags) data.tags = ctx.input.tags;
    if (ctx.input.info) data.info = ctx.input.info;

    let p = await client.createProject(data);

    return {
      output: {
        projectId: p.id,
        name: p.name,
        identifier: p.identifier,
        active: p.active,
        billable: p.billable,
        fixedPrice: p.fixed_price,
        retainer: p.retainer,
        startDate: p.start_date,
        finishDate: p.finish_date,
        currency: p.currency,
        budgetTotal: p.budget,
        budgetMonthly: p.budget_monthly,
        tags: p.tags,
        leader: p.leader,
        customer: p.customer,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      },
      message: `Created project **${p.name}** (ID: ${p.id}).`
    };
  })
  .build();

export let updateProject = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Update an existing project's properties. Can also archive or unarchive projects by setting the action field.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.number().describe('The ID of the project to update'),
      action: z
        .enum(['update', 'archive', 'unarchive'])
        .optional()
        .default('update')
        .describe('Action to perform: update fields, archive, or unarchive'),
      name: z.string().optional().describe('New project name'),
      startDate: z.string().optional().describe('New start date (YYYY-MM-DD)'),
      finishDate: z.string().optional().describe('New end date (YYYY-MM-DD)'),
      budgetTotal: z.number().optional().describe('New total budget'),
      tags: z.array(z.string()).optional().describe('Updated tags'),
      billable: z.boolean().optional().describe('Whether the project is billable'),
      hourlyRate: z.number().optional().describe('Default hourly rate')
    })
  )
  .output(projectOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    if (ctx.input.action === 'archive') {
      let p = await client.archiveProject(ctx.input.projectId);
      return {
        output: {
          projectId: p.id,
          name: p.name,
          active: p.active,
          createdAt: p.created_at,
          updatedAt: p.updated_at
        },
        message: `Archived project **${p.name}** (ID: ${p.id}).`
      };
    }

    if (ctx.input.action === 'unarchive') {
      let p = await client.unarchiveProject(ctx.input.projectId);
      return {
        output: {
          projectId: p.id,
          name: p.name,
          active: p.active,
          createdAt: p.created_at,
          updatedAt: p.updated_at
        },
        message: `Unarchived project **${p.name}** (ID: ${p.id}).`
      };
    }

    let data: Record<string, any> = {};
    if (ctx.input.name) data.name = ctx.input.name;
    if (ctx.input.startDate) data.start_date = ctx.input.startDate;
    if (ctx.input.finishDate) data.finish_date = ctx.input.finishDate;
    if (ctx.input.budgetTotal !== undefined) data.budget = ctx.input.budgetTotal;
    if (ctx.input.tags) data.tags = ctx.input.tags;
    if (ctx.input.billable !== undefined) data.billable = ctx.input.billable;
    if (ctx.input.hourlyRate !== undefined) data.hourly_rate = ctx.input.hourlyRate;

    let p = await client.updateProject(ctx.input.projectId, data);

    return {
      output: {
        projectId: p.id,
        name: p.name,
        identifier: p.identifier,
        active: p.active,
        billable: p.billable,
        fixedPrice: p.fixed_price,
        retainer: p.retainer,
        startDate: p.start_date,
        finishDate: p.finish_date,
        currency: p.currency,
        budgetTotal: p.budget,
        budgetMonthly: p.budget_monthly,
        tags: p.tags,
        leader: p.leader,
        customer: p.customer,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      },
      message: `Updated project **${p.name}** (ID: ${p.id}).`
    };
  })
  .build();

export let deleteProject = SlateTool.create(spec, {
  name: 'Delete Project',
  key: 'delete_project',
  description: `Permanently delete a project. Only projects with no activities, invoices, offers, or expenses can be deleted.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('The ID of the project to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });
    await client.deleteProject(ctx.input.projectId);

    return {
      output: { success: true },
      message: `Deleted project with ID **${ctx.input.projectId}**.`
    };
  })
  .build();

export let getProjectReport = SlateTool.create(spec, {
  name: 'Get Project Report',
  key: 'get_project_report',
  description: `Retrieve a project's business report with key indicators including budget progress, hours logged, invoiced amounts, and cost breakdowns.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('The ID of the project')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('Project ID'),
      name: z.string().optional().describe('Project name'),
      budgetTotal: z.number().optional().describe('Total budget'),
      budgetProgress: z.number().optional().describe('Budget progress percentage'),
      hoursTotal: z.number().optional().describe('Total hours logged'),
      costTotal: z.number().optional().describe('Total costs'),
      invoicedTotal: z.number().optional().describe('Total invoiced amount'),
      currency: z.string().optional().describe('Currency code'),
      report: z.any().describe('Full report data from MOCO')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });
    let report = await client.getProjectReport(ctx.input.projectId);

    return {
      output: {
        projectId: ctx.input.projectId,
        name: report.name,
        budgetTotal: report.budget_total,
        budgetProgress: report.budget_progress_percentage,
        hoursTotal: report.hours_total,
        costTotal: report.cost_total,
        invoicedTotal: report.invoiced_total,
        currency: report.currency,
        report
      },
      message: `Retrieved report for project **${report.name || ctx.input.projectId}**.`
    };
  })
  .build();
