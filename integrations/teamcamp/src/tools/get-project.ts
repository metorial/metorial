import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieve detailed information about a specific project, including its description, dates, associated customer, owner, and assigned users. Optionally includes the project's task groups.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to retrieve'),
      includeGroups: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to also fetch the project task groups')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Unique project identifier'),
      projectName: z.string().describe('Name of the project'),
      workspaceId: z.string().optional().describe('ID of the workspace'),
      ownerId: z.string().optional().describe('ID of the project owner'),
      description: z.string().optional().describe('Project description'),
      customerId: z.string().optional().describe('ID of the associated customer'),
      startDate: z.string().optional().describe('Project start date (yyyy-MM-dd)'),
      dueDate: z.string().optional().describe('Project due date (yyyy-MM-dd)'),
      favoriteUsers: z
        .array(z.string())
        .optional()
        .describe('IDs of users who favorited this project'),
      projectUsers: z
        .array(z.string())
        .optional()
        .describe('IDs of users assigned to this project'),
      groups: z
        .array(
          z.object({
            groupId: z.string().describe('Unique group identifier'),
            groupName: z.string().describe('Name of the group')
          })
        )
        .optional()
        .describe('Task groups within the project (only included when includeGroups is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let project = await client.getProject(ctx.input.projectId);

    let result: any = {
      projectId: project.projectId ?? '',
      projectName: project.projectName ?? '',
      workspaceId: project.workspaceId || undefined,
      ownerId: project.ownerId || undefined,
      description: project.description || undefined,
      customerId: project.customerId || undefined,
      startDate: project.startDate || undefined,
      dueDate: project.dueDate || undefined,
      favoriteUsers: Array.isArray(project.favoriteUsers) ? project.favoriteUsers : undefined,
      projectUsers: Array.isArray(project.projectUsers) ? project.projectUsers : undefined
    };

    if (ctx.input.includeGroups) {
      let groups = await client.getProjectGroups(ctx.input.projectId);
      result.groups = (Array.isArray(groups) ? groups : []).map((g: any) => ({
        groupId: g.groupId ?? g.id ?? '',
        groupName: g.groupName ?? g.name ?? ''
      }));
    }

    return {
      output: result,
      message: `Retrieved project **${result.projectName}**${result.groups ? ` with ${result.groups.length} group(s)` : ''}.`
    };
  })
  .build();
