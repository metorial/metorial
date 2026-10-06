import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BugsnagClient } from '../lib/client';
import { pageInput, pageOutput } from '../lib/schemas';
import { spec } from '../spec';

let collaboratorSchema = z.object({
  collaboratorId: z.string().describe('Collaborator user ID'),
  name: z.string().optional().describe('Collaborator name'),
  email: z.string().optional().describe('Collaborator email'),
  admin: z.boolean().optional().describe('Whether the collaborator is an admin'),
  twoFactorEnabled: z.boolean().optional().describe('Whether 2FA is enabled'),
  pendingInvitation: z.boolean().optional().describe('Whether the invitation is pending'),
  createdAt: z.string().optional().describe('When the collaborator was added')
});

export let manageCollaborators = SlateTool.create(spec, {
  name: 'Manage Collaborators',
  key: 'manage_collaborators',
  description: `List, invite, update, or remove collaborators in a Bugsnag organization. Use **list** to see all collaborators, **invite** to add a new one by email, **update** to change permissions, or **remove** to revoke access.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      ...pageInput,
      action: z.enum(['list', 'invite', 'update', 'remove']).describe('Operation to perform'),
      organizationId: z.string().describe('Organization ID'),
      collaboratorId: z
        .string()
        .optional()
        .describe('Collaborator user ID (for update/remove)'),
      email: z.string().optional().describe('Email address (for invite)'),
      admin: z
        .boolean()
        .optional()
        .describe('Whether the collaborator should be an admin (for invite/update)'),
      projectIds: z
        .array(z.string())
        .optional()
        .describe('Project IDs to grant access to (for invite/update)'),
      perPage: z.number().optional().describe('Results per page for list (max 100)')
    })
  )
  .output(
    z.object({
      ...pageOutput,
      collaborators: z
        .array(collaboratorSchema)
        .optional()
        .describe('List of collaborators (for list action)'),
      collaborator: collaboratorSchema.optional().describe('Created/updated collaborator'),
      removed: z.boolean().optional().describe('Whether the collaborator was removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugsnagClient(ctx.auth);
    let orgId = ctx.input.organizationId || ctx.config.organizationId;
    if (!orgId) throw createApiServiceError('Organization ID is required.');

    if (ctx.input.action === 'list') {
      let collaborators = await client.listOrganizationCollaborators(orgId, {
        perPage: ctx.input.perPage,
        pageUrl: ctx.input.pageUrl
      });

      let mapped = collaborators.map(c => ({
        collaboratorId: c.id ?? undefined,
        name: c.name ?? undefined,
        email: c.email ?? undefined,
        admin: c.is_admin ?? undefined,
        twoFactorEnabled: c.two_factor_enabled ?? undefined,
        pendingInvitation: c.pending_invitation ?? undefined,
        createdAt: c.created_at ?? undefined
      }));

      return {
        output: { collaborators: mapped, ...client.pageInfo },
        message: `Found **${mapped.length}** collaborator(s).`
      };
    }

    if (ctx.input.action === 'invite') {
      if (!ctx.input.email)
        throw createApiServiceError('Email is required to invite a collaborator.');

      let result = await client.inviteCollaborator(orgId, {
        email: ctx.input.email,
        admin: ctx.input.admin,
        project_ids: ctx.input.projectIds
      });

      return {
        output: {
          collaborator: {
            collaboratorId: result.id ?? undefined,
            name: result.name ?? undefined,
            email: result.email ?? undefined,
            admin: result.is_admin ?? undefined,
            pendingInvitation: result.pending_invitation ?? undefined
          }
        },
        message: `Invited **${ctx.input.email}** to the organization.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.collaboratorId)
        throw createApiServiceError('Collaborator ID is required for update.');

      let updateData: Record<string, unknown> = {};
      if (ctx.input.admin !== undefined) updateData.admin = ctx.input.admin;
      if (ctx.input.projectIds) updateData.project_ids = ctx.input.projectIds;

      if (!Object.keys(updateData).length)
        throw createApiServiceError('Supply admin or projectIds to update permissions.');
      let result = await client.updateCollaborator(
        orgId,
        ctx.input.collaboratorId,
        updateData
      );

      return {
        output: {
          collaborator: {
            collaboratorId: result.id ?? undefined,
            name: result.name ?? undefined,
            email: result.email ?? undefined,
            admin: result.is_admin ?? undefined
          }
        },
        message: `Updated collaborator \`${ctx.input.collaboratorId}\`.`
      };
    }

    if (ctx.input.action === 'remove') {
      if (!ctx.input.collaboratorId)
        throw createApiServiceError('Collaborator ID is required for removal.');

      await client.removeCollaborator(orgId, ctx.input.collaboratorId);

      return {
        output: { removed: true },
        message: `Removed collaborator \`${ctx.input.collaboratorId}\` from the organization.`
      };
    }

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
