import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCollaboration = SlateTool.create(spec, {
  name: 'Manage Collaboration',
  key: 'manage_collaboration',
  description: `Create, update, or remove collaborations on Box files and folders. Invite users or groups with specific roles (editor, viewer, co-owner, etc.), update collaboration roles, or remove collaborators.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'list'])
        .describe('The collaboration operation to perform'),
      collaborationId: z
        .string()
        .optional()
        .describe('Collaboration ID (required for update and delete)'),
      itemType: z
        .enum(['file', 'folder'])
        .optional()
        .describe('Type of item to collaborate on (required for create and list)'),
      itemId: z
        .string()
        .optional()
        .describe('ID of the file or folder (required for create and list)'),
      collaboratorEmail: z
        .string()
        .optional()
        .describe('Email address of the user to invite (for create)'),
      collaboratorUserId: z
        .string()
        .optional()
        .describe('User ID of the collaborator (for create, alternative to email)'),
      collaboratorGroupId: z
        .string()
        .optional()
        .describe('Group ID to invite (for create, alternative to email/userId)'),
      role: z
        .enum([
          'editor',
          'viewer',
          'previewer',
          'uploader',
          'previewer_uploader',
          'viewer_uploader',
          'co-owner',
          'owner'
        ])
        .optional()
        .describe('Collaboration role (required for create and update)')
    })
  )
  .output(
    z.object({
      collaborationId: z.string().optional().describe('Collaboration ID'),
      role: z.string().optional().describe('Assigned role'),
      status: z
        .string()
        .optional()
        .describe('Collaboration status (accepted, pending, rejected)'),
      collaborator: z
        .object({
          userId: z.string().optional(),
          name: z.string().optional(),
          login: z.string().optional()
        })
        .optional()
        .describe('Collaborator information'),
      deleted: z.boolean().optional().describe('True if the collaboration was removed'),
      collaborations: z
        .array(
          z.object({
            collaborationId: z.string(),
            role: z.string(),
            status: z.string().optional(),
            collaboratorName: z.string().optional(),
            collaboratorLogin: z.string().optional()
          })
        )
        .optional()
        .describe('List of collaborations (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let {
      action,
      collaborationId,
      itemType,
      itemId,
      collaboratorEmail,
      collaboratorUserId,
      collaboratorGroupId,
      role
    } = ctx.input;

    if (action === 'list') {
      if (!itemType || !itemId)
        throw new Error('itemType and itemId are required for list action');
      let collabs =
        itemType === 'file'
          ? await client.getFileCollaborations(itemId)
          : await client.getFolderCollaborations(itemId);
      let mapped = collabs.map((c: any) => ({
        collaborationId: c.id,
        role: c.role,
        status: c.status,
        collaboratorName: c.accessible_by?.name,
        collaboratorLogin: c.accessible_by?.login
      }));
      return {
        output: { collaborations: mapped },
        message: `Found ${mapped.length} collaboration(s) on ${itemType} ${itemId}.`
      };
    }

    if (action === 'create') {
      if (!itemType || !itemId)
        throw new Error('itemType and itemId are required for create action');
      if (!role) throw new Error('role is required for create action');

      let accessibleBy: { type: string; id?: string; login?: string } = { type: 'user' };
      if (collaboratorGroupId) {
        accessibleBy = { type: 'group', id: collaboratorGroupId };
      } else if (collaboratorUserId) {
        accessibleBy = { type: 'user', id: collaboratorUserId };
      } else if (collaboratorEmail) {
        accessibleBy = { type: 'user', login: collaboratorEmail };
      } else {
        throw new Error(
          'One of collaboratorEmail, collaboratorUserId, or collaboratorGroupId is required'
        );
      }

      let collab = await client.createCollaboration(itemType, itemId, accessibleBy, role);
      return {
        output: {
          collaborationId: collab.id,
          role: collab.role,
          status: collab.status,
          collaborator: {
            userId: collab.accessible_by?.id,
            name: collab.accessible_by?.name,
            login: collab.accessible_by?.login
          }
        },
        message: `Created collaboration with role **${collab.role}** on ${itemType} ${itemId}.`
      };
    }

    if (action === 'update') {
      if (!collaborationId) throw new Error('collaborationId is required for update action');
      if (!role) throw new Error('role is required for update action');
      let collab = await client.updateCollaboration(collaborationId, role);
      return {
        output: {
          collaborationId: collab.id,
          role: collab.role,
          status: collab.status,
          collaborator: {
            userId: collab.accessible_by?.id,
            name: collab.accessible_by?.name,
            login: collab.accessible_by?.login
          }
        },
        message: `Updated collaboration ${collaborationId} to role **${collab.role}**.`
      };
    }

    // delete
    if (!collaborationId) throw new Error('collaborationId is required for delete action');
    await client.deleteCollaboration(collaborationId);
    return {
      output: { collaborationId, deleted: true },
      message: `Removed collaboration ${collaborationId}.`
    };
  });
