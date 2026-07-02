import { SlateTool } from 'slates';
import { z } from 'zod';
import { AzureDevOpsClient } from '../lib/client';
import { spec } from '../spec';

export let createWorkItemTool = SlateTool.create(spec, {
  name: 'Create Work Item',
  key: 'create_work_item',
  description: `Create a new work item (bug, task, user story, epic, feature, or any custom type) in a project. Set title, description, state, assigned user, area/iteration paths, tags, and any custom fields.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      project: z
        .string()
        .optional()
        .describe('Project name or ID. Uses default project from config if not provided.'),
      workItemType: z
        .string()
        .describe('Work item type (e.g. "Bug", "Task", "User Story", "Epic", "Feature")'),
      title: z.string().describe('Title of the work item'),
      description: z.string().optional().describe('HTML description of the work item'),
      assignedTo: z
        .string()
        .optional()
        .describe('Display name or email of the user to assign'),
      state: z
        .string()
        .optional()
        .describe('Initial state (e.g. "New", "Active", "Resolved")'),
      areaPath: z.string().optional().describe('Area path for the work item'),
      iterationPath: z
        .string()
        .optional()
        .describe('Iteration path / sprint for the work item'),
      tags: z
        .string()
        .optional()
        .describe('Semicolon-separated tags (e.g. "frontend;urgent")'),
      priority: z
        .number()
        .optional()
        .describe('Priority (1=Critical, 2=High, 3=Medium, 4=Low)'),
      parentWorkItemId: z.number().optional().describe('ID of parent work item to link to'),
      additionalFields: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Additional fields as key-value pairs using field reference names (e.g. { "Microsoft.VSTS.Scheduling.StoryPoints": 5 })'
        )
    })
  )
  .output(
    z.object({
      workItemId: z.number(),
      workItemType: z.string(),
      title: z.string(),
      state: z.string(),
      url: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new AzureDevOpsClient({
      token: ctx.auth.token,
      organization: ctx.config.organization
    });
    let project = ctx.input.project || ctx.config.project;
    if (!project)
      throw new Error(
        'Project is required. Provide it in the input or set a default project in config.'
      );

    let fields: Record<string, any> = {
      'System.Title': ctx.input.title
    };

    if (ctx.input.description) fields['System.Description'] = ctx.input.description;
    if (ctx.input.assignedTo) fields['System.AssignedTo'] = ctx.input.assignedTo;
    if (ctx.input.state) fields['System.State'] = ctx.input.state;
    if (ctx.input.areaPath) fields['System.AreaPath'] = ctx.input.areaPath;
    if (ctx.input.iterationPath) fields['System.IterationPath'] = ctx.input.iterationPath;
    if (ctx.input.tags) fields['System.Tags'] = ctx.input.tags;
    if (ctx.input.priority) fields['Microsoft.VSTS.Common.Priority'] = ctx.input.priority;

    if (ctx.input.additionalFields) {
      for (let [key, value] of Object.entries(ctx.input.additionalFields)) {
        fields[key] = value;
      }
    }

    // Create work item first
    let result = await client.createWorkItem(project, ctx.input.workItemType, fields);

    // If parent link requested, add it via update
    if (ctx.input.parentWorkItemId) {
      let orgUrl = `https://dev.azure.com/${ctx.config.organization}`;
      await client.updateWorkItem(project, result.id, [
        {
          op: 'add',
          path: '/relations/-',
          value: {
            rel: 'System.LinkTypes.Hierarchy-Reverse',
            url: `${orgUrl}/_apis/wit/workItems/${ctx.input.parentWorkItemId}`,
            attributes: { name: 'Parent' }
          }
        }
      ]);
    }

    return {
      output: {
        workItemId: result.id,
        workItemType: result.fields['System.WorkItemType'],
        title: result.fields['System.Title'],
        state: result.fields['System.State'],
        url: result._links?.html?.href || result.url
      },
      message: `Created **${ctx.input.workItemType}** #${result.id}: "${ctx.input.title}"`
    };
  })
  .build();
