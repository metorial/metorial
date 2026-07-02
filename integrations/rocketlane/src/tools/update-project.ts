import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateProject = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Updates an existing project in Rocketlane. Supports updating the project name, dates, description, visibility, owner, custom fields, and managing project members (add/remove).`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z.number().describe('ID of the project to update'),
      projectName: z.string().optional().describe('New project name'),
      startDate: z.string().optional().describe('New start date in YYYY-MM-DD format'),
      dueDate: z.string().optional().describe('New due date in YYYY-MM-DD format'),
      projectDescription: z
        .string()
        .optional()
        .describe('New project description (HTML supported)'),
      visibility: z.string().optional().describe('Project visibility setting'),
      ownerEmail: z.string().optional().describe('Email of the new project owner'),
      ownerId: z.number().optional().describe('User ID of the new project owner'),
      fields: z
        .array(
          z.object({
            fieldId: z.number().describe('Custom field ID'),
            fieldValue: z.any().describe('Custom field value')
          })
        )
        .optional()
        .describe('Custom field values to update'),
      addMembers: z
        .array(
          z.object({
            emailId: z.string().optional().describe('Email of the member to add'),
            userId: z.number().optional().describe('User ID of the member to add'),
            role: z.string().optional().describe('Role for the member')
          })
        )
        .optional()
        .describe('Members to add to the project'),
      removeMemberIds: z.array(z.number()).optional().describe('User IDs of members to remove')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('ID of the updated project'),
      projectName: z.string().optional().describe('Updated project name'),
      startDate: z.string().nullable().optional().describe('Updated start date'),
      dueDate: z.string().nullable().optional().describe('Updated due date'),
      archived: z.boolean().optional().describe('Whether the project is archived'),
      status: z.any().optional().describe('Project status'),
      owner: z.any().optional().describe('Project owner')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let owner: { emailId?: string; userId?: number } | undefined;
    if (ctx.input.ownerEmail || ctx.input.ownerId) {
      owner = {};
      if (ctx.input.ownerEmail) owner.emailId = ctx.input.ownerEmail;
      if (ctx.input.ownerId) owner.userId = ctx.input.ownerId;
    }

    let result = await client.updateProject(ctx.input.projectId, {
      projectName: ctx.input.projectName,
      startDate: ctx.input.startDate,
      dueDate: ctx.input.dueDate,
      projectDescription: ctx.input.projectDescription,
      visibility: ctx.input.visibility,
      owner,
      fields: ctx.input.fields
    });

    if (ctx.input.addMembers && ctx.input.addMembers.length > 0) {
      await client.addProjectMembers(ctx.input.projectId, ctx.input.addMembers);
    }

    if (ctx.input.removeMemberIds) {
      for (let userId of ctx.input.removeMemberIds) {
        await client.removeProjectMember(ctx.input.projectId, userId);
      }
    }

    return {
      output: result,
      message: `Project **${result.projectName || ctx.input.projectId}** updated successfully.`
    };
  })
  .build();
