import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickHouseClient } from '../lib/client';
import { clickhouseServiceError } from '../lib/errors';
import { spec } from '../spec';

let assignedRoleSchema = z.object({
  roleId: z.string().optional(),
  roleName: z.string().optional(),
  roleType: z.string().optional()
});

let memberSchema = z.object({
  userId: z.string().describe('Unique user ID'),
  name: z.string().optional().describe('Display name of the member'),
  email: z.string().optional().describe('Email address of the member'),
  role: z.string().optional().describe('Deprecated role of the member (admin or developer)'),
  assignedRoles: z.array(assignedRoleSchema).optional().describe('Current assigned roles'),
  joinedAt: z.string().optional().describe('When the member joined the organization')
});

export let listMembers = SlateTool.create(spec, {
  name: 'List Members',
  key: 'list_members',
  description: `List all members in the organization. Returns each member's user ID, name, email, assigned roles, deprecated role, and join date.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      members: z.array(memberSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let members = await client.listMembers();
    let items = Array.isArray(members) ? members : [];

    return {
      output: {
        members: items.map((m: any) => ({
          userId: m.userId,
          name: m.name,
          email: m.email,
          role: m.role,
          assignedRoles: m.assignedRoles,
          joinedAt: m.joinedAt
        }))
      },
      message: `Found **${items.length}** members in the organization.`
    };
  })
  .build();

export let updateMember = SlateTool.create(spec, {
  name: 'Update Member',
  key: 'update_member',
  description: `Update an organization member's role or assigned roles. Use this to promote, demote, or change permissions for a member.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      userId: z.string().describe('The user ID of the member to update'),
      role: z
        .enum(['admin', 'developer'])
        .optional()
        .describe('Deprecated role to assign to the member'),
      assignedRoleIds: z
        .array(z.string())
        .optional()
        .describe('List of current role IDs to assign to the member')
    })
  )
  .output(
    z.object({
      userId: z.string(),
      role: z.string().optional(),
      assignedRoles: z.array(assignedRoleSchema).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: Record<string, any> = {};
    if (ctx.input.role) body.role = ctx.input.role;
    if (ctx.input.assignedRoleIds) body.assignedRoleIds = ctx.input.assignedRoleIds;

    if (Object.keys(body).length === 0) {
      throw clickhouseServiceError('Provide role or assignedRoleIds to update a member.');
    }

    let result = await client.updateMember(ctx.input.userId, body);

    return {
      output: {
        userId: result.userId || ctx.input.userId,
        role: result.role,
        assignedRoles: result.assignedRoles
      },
      message: `Updated member **${ctx.input.userId}** roles.`
    };
  })
  .build();

export let removeMember = SlateTool.create(spec, {
  name: 'Remove Member',
  key: 'remove_member',
  description: `Remove a member from the organization. This action is irreversible.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('The user ID of the member to remove')
    })
  )
  .output(
    z.object({
      removed: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    await client.removeMember(ctx.input.userId);

    return {
      output: { removed: true },
      message: `Removed member **${ctx.input.userId}** from the organization.`
    };
  })
  .build();
