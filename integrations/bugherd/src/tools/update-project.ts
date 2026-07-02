import { SlateTool } from 'slates';
import { z } from 'zod';
import { BugherdClient } from '../lib/client';
import { spec } from '../spec';

export let updateProject = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Update an existing BugHerd project's settings. Can modify name, URL, active status, public feedback, and guest visibility. Can also add members or guests to the project.`,
  instructions: [
    'To add a guest by email, provide the email address in addGuestEmail. If the user does not exist, they will be invited.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.number().describe('ID of the project to update'),
      name: z.string().optional().describe('New project name'),
      devurl: z.string().optional().describe('New website URL'),
      isActive: z.boolean().optional().describe('Set active status'),
      isPublic: z.boolean().optional().describe('Set public feedback visibility'),
      permission: z
        .enum(['guests_see_guests', 'guests_see_self'])
        .optional()
        .describe('Guest visibility permission'),
      addMemberIds: z.array(z.number()).optional().describe('User IDs to add as team members'),
      addGuestId: z.number().optional().describe('User ID to add as a guest/client'),
      addGuestEmail: z
        .string()
        .optional()
        .describe('Email address to add as a guest/client (invites if not existing)')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('Updated project ID'),
      name: z.string().describe('Project name'),
      isActive: z.boolean().describe('Whether the project is active'),
      isPublic: z.boolean().describe('Whether public feedback is enabled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugherdClient(ctx.auth.token);
    let { projectId, addMemberIds, addGuestId, addGuestEmail, ...updateFields } = ctx.input;

    let hasUpdateFields = Object.values(updateFields).some(v => v !== undefined);

    if (hasUpdateFields) {
      await client.updateProject(projectId, {
        name: updateFields.name,
        devurl: updateFields.devurl,
        isActive: updateFields.isActive,
        isPublic: updateFields.isPublic,
        permission: updateFields.permission
      });
    }

    if (addMemberIds && addMemberIds.length > 0) {
      await client.addMemberToProject(projectId, addMemberIds);
    }

    if (addGuestId) {
      await client.addGuestToProject(projectId, { userId: addGuestId });
    }

    if (addGuestEmail) {
      await client.addGuestToProject(projectId, { email: addGuestEmail });
    }

    let project = await client.getProject(projectId);

    return {
      output: {
        projectId: project.id,
        name: project.name,
        isActive: project.is_active,
        isPublic: project.is_public
      },
      message: `Updated project **${project.name}** (ID: ${project.id}).`
    };
  })
  .build();
