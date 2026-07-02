import { SlateTool } from 'slates';
import { z } from 'zod';
import { AzureDevOpsClient } from '../lib/client';
import { spec } from '../spec';

export let updateWorkItemTool = SlateTool.create(spec, {
  name: 'Update Work Item',
  key: 'update_work_item',
  description: `Update an existing work item. Change title, description, state, assignment, area/iteration paths, tags, priority, add comments, or set custom fields. Supports adding parent/child links.`,
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
      workItemId: z.number().describe('ID of the work item to update'),
      title: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New HTML description'),
      assignedTo: z
        .string()
        .optional()
        .describe('Display name or email of the user to assign'),
      state: z.string().optional().describe('New state (e.g. "Active", "Resolved", "Closed")'),
      areaPath: z.string().optional().describe('New area path'),
      iterationPath: z.string().optional().describe('New iteration path / sprint'),
      tags: z
        .string()
        .optional()
        .describe('Semicolon-separated tags (replaces existing tags)'),
      priority: z
        .number()
        .optional()
        .describe('Priority (1=Critical, 2=High, 3=Medium, 4=Low)'),
      comment: z.string().optional().describe('Add a discussion comment (appears in History)'),
      additionalFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional fields to update as key-value pairs using field reference names')
    })
  )
  .output(
    z.object({
      workItemId: z.number(),
      workItemType: z.string(),
      title: z.string(),
      state: z.string(),
      rev: z.number(),
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

    let operations: Array<{ op: string; path: string; value?: any }> = [];

    let fieldMap: Record<string, any> = {};
    if (ctx.input.title !== undefined) fieldMap['System.Title'] = ctx.input.title;
    if (ctx.input.description !== undefined)
      fieldMap['System.Description'] = ctx.input.description;
    if (ctx.input.assignedTo !== undefined)
      fieldMap['System.AssignedTo'] = ctx.input.assignedTo;
    if (ctx.input.state !== undefined) fieldMap['System.State'] = ctx.input.state;
    if (ctx.input.areaPath !== undefined) fieldMap['System.AreaPath'] = ctx.input.areaPath;
    if (ctx.input.iterationPath !== undefined)
      fieldMap['System.IterationPath'] = ctx.input.iterationPath;
    if (ctx.input.tags !== undefined) fieldMap['System.Tags'] = ctx.input.tags;
    if (ctx.input.priority !== undefined)
      fieldMap['Microsoft.VSTS.Common.Priority'] = ctx.input.priority;
    if (ctx.input.comment !== undefined) fieldMap['System.History'] = ctx.input.comment;

    if (ctx.input.additionalFields) {
      for (let [key, value] of Object.entries(ctx.input.additionalFields)) {
        fieldMap[key] = value;
      }
    }

    for (let [field, value] of Object.entries(fieldMap)) {
      operations.push({ op: 'add', path: `/fields/${field}`, value });
    }

    if (operations.length === 0) {
      throw new Error('No fields to update. Provide at least one field to change.');
    }

    let result = await client.updateWorkItem(project, ctx.input.workItemId, operations);

    return {
      output: {
        workItemId: result.id,
        workItemType: result.fields['System.WorkItemType'],
        title: result.fields['System.Title'],
        state: result.fields['System.State'],
        rev: result.rev,
        url: result._links?.html?.href || result.url
      },
      message: `Updated work item **#${result.id}** — "${result.fields['System.Title']}"`
    };
  })
  .build();
