import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickHouseClient } from '../lib/client';
import { spec } from '../spec';

let assignedRoleSchema = z.object({
  roleId: z.string().optional(),
  roleName: z.string().optional(),
  roleType: z.string().optional()
});

let invitationSchema = z.object({
  invitationId: z.string().describe('Unique identifier of the invitation'),
  email: z.string().describe('Email address of the invitee'),
  role: z.string().optional().describe('Deprecated role assigned to the invitation'),
  assignedRoles: z.array(assignedRoleSchema).optional().describe('Current assigned roles'),
  createdAt: z.string().optional().describe('When the invitation was created'),
  expireAt: z.string().optional().describe('When the invitation expires')
});

export let listInvitations = SlateTool.create(spec, {
  name: 'List Invitations',
  key: 'list_invitations',
  description: `List all pending invitations for the organization. Shows who has been invited, their assigned roles, deprecated role, and expiration dates.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      invitations: z.array(invitationSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let invitations = await client.listInvitations();
    let items = Array.isArray(invitations) ? invitations : [];

    return {
      output: {
        invitations: items.map((inv: any) => ({
          invitationId: inv.id,
          email: inv.email,
          role: inv.role,
          assignedRoles: inv.assignedRoles,
          createdAt: inv.createdAt,
          expireAt: inv.expireAt
        }))
      },
      message: `Found **${items.length}** pending invitations.`
    };
  })
  .build();

export let createInvitation = SlateTool.create(spec, {
  name: 'Create Invitation',
  key: 'create_invitation',
  description: `Invite a new member to the organization by email. Specify the role and optional assigned role IDs.`
})
  .input(
    z.object({
      email: z.string().describe('Email address of the person to invite'),
      role: z
        .enum(['admin', 'developer'])
        .optional()
        .describe('Deprecated role to assign (admin or developer)'),
      assignedRoleIds: z.array(z.string()).optional().describe('Current role IDs to assign')
    })
  )
  .output(
    z.object({
      invitationId: z.string().describe('ID of the created invitation'),
      email: z.string(),
      role: z.string().optional(),
      assignedRoles: z.array(assignedRoleSchema).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.createInvitation({
      email: ctx.input.email,
      role: ctx.input.role,
      assignedRoleIds: ctx.input.assignedRoleIds
    });

    return {
      output: {
        invitationId: result.id,
        email: result.email || ctx.input.email,
        role: result.role,
        assignedRoles: result.assignedRoles
      },
      message: `Invitation sent to **${ctx.input.email}**.`
    };
  })
  .build();

export let deleteInvitation = SlateTool.create(spec, {
  name: 'Delete Invitation',
  key: 'delete_invitation',
  description: `Revoke a pending invitation. The invitee will no longer be able to join the organization using this invitation.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      invitationId: z.string().describe('ID of the invitation to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    await client.deleteInvitation(ctx.input.invitationId);

    return {
      output: { deleted: true },
      message: `Invitation **${ctx.input.invitationId}** has been deleted.`
    };
  })
  .build();
