import { SlateTool } from 'slates';
import { z } from 'zod';
import { EverhourClient } from '../lib/client';
import { spec } from '../spec';

let projectSchema = z.object({
  projectId: z.string().describe('Project ID (e.g., "ev:1234567890")'),
  name: z.string().describe('Project name'),
  type: z.string().optional().describe('Project type: board or list'),
  favorite: z.boolean().optional().describe('Whether project is favorited'),
  users: z.array(z.number()).optional().describe('Assigned user IDs'),
  clientId: z.number().optional().describe('Associated client ID'),
  workspaceName: z.string().optional().describe('Workspace name (for external projects)'),
  billing: z.any().optional().describe('Billing configuration'),
  rate: z.any().optional().describe('Rate configuration'),
  budget: z.any().optional().describe('Budget configuration')
});

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all projects or search by name. Optionally filter by integration platform (e.g., "ev" for Everhour-native, "as" for Asana, "jr" for Jira, "tr" for Trello, "cl" for ClickUp, "mo" for Monday).`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search by project name'),
      platform: z
        .string()
        .optional()
        .describe('Filter by platform: ev, as, jr, tr, cl, mo, gh, b3, etc.'),
      limit: z.number().optional().describe('Maximum number of projects to return')
    })
  )
  .output(
    z.object({
      projects: z.array(projectSchema).describe('List of projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    let projects = await client.listProjects(ctx.input);
    let mapped = projects.map((p: any) => ({
      projectId: p.id,
      name: p.name,
      type: p.type,
      favorite: p.favorite,
      users: p.users,
      clientId: p.client,
      workspaceName: p.workspaceName,
      billing: p.billing,
      rate: p.rate,
      budget: p.budget
    }));
    return {
      output: { projects: mapped },
      message: `Found **${mapped.length}** project(s).`
    };
  });

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieve detailed information about a specific project including billing, budget, rate, and member assignments.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      projectId: z.string().describe('Project ID (e.g., "ev:1234567890")')
    })
  )
  .output(projectSchema)
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    let p = await client.getProject(ctx.input.projectId);
    return {
      output: {
        projectId: p.id,
        name: p.name,
        type: p.type,
        favorite: p.favorite,
        users: p.users,
        clientId: p.client,
        workspaceName: p.workspaceName,
        billing: p.billing,
        rate: p.rate,
        budget: p.budget
      },
      message: `Retrieved project **${p.name}**.`
    };
  });

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new Everhour-native project. Specify the project type as "board" or "list" and optionally assign team members.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Project name'),
      type: z.enum(['board', 'list']).describe('Project type'),
      users: z.array(z.number()).optional().describe('User IDs to assign to the project')
    })
  )
  .output(projectSchema)
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    let p = await client.createProject(ctx.input);
    return {
      output: {
        projectId: p.id,
        name: p.name,
        type: p.type,
        favorite: p.favorite,
        users: p.users,
        clientId: p.client,
        workspaceName: p.workspaceName,
        billing: p.billing,
        rate: p.rate,
        budget: p.budget
      },
      message: `Created project **${p.name}** (${p.id}).`
    };
  });

export let updateProject = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Update a project's name, assigned users, billing settings, budget, or archive status. Combines multiple project operations into one flexible tool.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      projectId: z.string().describe('Project ID'),
      name: z.string().optional().describe('New project name'),
      users: z.array(z.number()).optional().describe('Updated user IDs'),
      archived: z.boolean().optional().describe('Set to true to archive, false to unarchive'),
      billing: z
        .object({
          type: z.enum(['non_billable', 'hourly', 'fixed_fee']).describe('Billing type'),
          fee: z.number().optional().describe('Fixed fee in cents (only for fixed_fee type)')
        })
        .optional()
        .describe('Billing configuration'),
      budget: z
        .object({
          type: z.enum(['money', 'time', 'costs']).describe('Budget type'),
          budget: z.number().describe('Budget amount in cents or seconds'),
          period: z.enum(['general', 'monthly', 'weekly', 'daily']).optional(),
          appliedFrom: z.string().optional().describe('Start date (YYYY-MM-DD)'),
          disallowOverbudget: z.boolean().optional(),
          threshold: z.number().optional().describe('Alert threshold percentage (1-100)')
        })
        .optional()
        .describe('Budget configuration'),
      rate: z
        .object({
          type: z.enum(['project_rate', 'user_rate']).describe('Rate type'),
          rate: z.number().optional().describe('Flat rate in cents (for project_rate)'),
          userRateOverrides: z
            .record(z.string(), z.number())
            .optional()
            .describe('Per-user rate overrides (user ID -> cents)')
        })
        .optional()
        .describe('Rate configuration')
    })
  )
  .output(projectSchema)
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    let { projectId, archived, billing, budget, rate, ...updateData } = ctx.input;

    if (Object.keys(updateData).length > 0) {
      await client.updateProject(projectId, updateData);
    }

    if (archived !== undefined) {
      await client.archiveProject(projectId, archived);
    }

    if (billing || budget || rate) {
      let billingData: any = {};
      if (billing) billingData.billing = billing;
      if (budget) billingData.budget = budget;
      if (rate) billingData.rate = rate;
      await client.setProjectBilling(projectId, billingData);
    }

    let p = await client.getProject(projectId);
    return {
      output: {
        projectId: p.id,
        name: p.name,
        type: p.type,
        favorite: p.favorite,
        users: p.users,
        clientId: p.client,
        workspaceName: p.workspaceName,
        billing: p.billing,
        rate: p.rate,
        budget: p.budget
      },
      message: `Updated project **${p.name}**.`
    };
  });

export let deleteProject = SlateTool.create(spec, {
  name: 'Delete Project',
  key: 'delete_project',
  description: `Permanently delete a project from Everhour.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      projectId: z.string().describe('Project ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    await client.deleteProject(ctx.input.projectId);
    return {
      output: { success: true },
      message: `Deleted project ${ctx.input.projectId}.`
    };
  });
