import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let orgOutputSchema = z.object({
  orgId: z.string().describe('Unique organization identifier'),
  handle: z.string().describe('Organization handle'),
  displayName: z.string().optional().describe('Display name'),
  avatarUrl: z.string().optional().describe('Avatar URL'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let getOrganization = SlateTool.create(spec, {
  name: 'Get Organization',
  key: 'get_organization',
  description: `Get detailed information about a specific organization.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orgHandle: z.string().describe('Organization handle')
    })
  )
  .output(orgOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let org = await client.getOrg(ctx.input.orgHandle);

    return {
      output: org,
      message: `Organization **${org.handle}** (${org.displayName || 'no display name'}).`
    };
  })
  .build();

export let createOrganization = SlateTool.create(spec, {
  name: 'Create Organization',
  key: 'create_organization',
  description: `Create a new organization. Organizations allow teams to collaborate and share workspaces, connections, and other resources.`
})
  .input(
    z.object({
      handle: z.string().describe('Unique handle for the organization'),
      displayName: z.string().optional().describe('Display name for the organization')
    })
  )
  .output(orgOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let org = await client.createOrg({
      handle: ctx.input.handle,
      displayName: ctx.input.displayName
    });

    return {
      output: org,
      message: `Created organization **${org.handle}**.`
    };
  })
  .build();

export let updateOrganization = SlateTool.create(spec, {
  name: 'Update Organization',
  key: 'update_organization',
  description: `Update an organization's handle or display name.`
})
  .input(
    z.object({
      orgHandle: z.string().describe('Current organization handle'),
      handle: z.string().optional().describe('New handle for the organization'),
      displayName: z.string().optional().describe('New display name')
    })
  )
  .output(orgOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let org = await client.updateOrg(ctx.input.orgHandle, {
      handle: ctx.input.handle,
      displayName: ctx.input.displayName
    });

    return {
      output: org,
      message: `Updated organization **${org.handle}**.`
    };
  })
  .build();

export let deleteOrganization = SlateTool.create(spec, {
  name: 'Delete Organization',
  key: 'delete_organization',
  description: `Permanently delete an organization and all its resources.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      orgHandle: z.string().describe('Handle of the organization to delete')
    })
  )
  .output(
    z.object({
      orgId: z.string().describe('Deleted organization identifier'),
      handle: z.string().describe('Deleted organization handle')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let org = await client.deleteOrg(ctx.input.orgHandle);

    return {
      output: org,
      message: `Deleted organization **${org.handle}**.`
    };
  })
  .build();

let memberSchema = z.object({
  userId: z.string().describe('User identifier'),
  orgId: z.string().describe('Organization identifier'),
  role: z.string().describe('Member role'),
  status: z.string().optional().describe('Member status'),
  displayName: z.string().optional().describe('Display name'),
  handle: z.string().optional().describe('User handle'),
  createdAt: z.string().optional().describe('Joined timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listOrgMembers = SlateTool.create(spec, {
  name: 'List Organization Members',
  key: 'list_org_members',
  description: `List all members of an organization with their roles and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orgHandle: z.string().describe('Organization handle'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      nextToken: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      members: z.array(memberSchema).describe('List of organization members'),
      nextToken: z.string().optional().describe('Pagination cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.listOrgMembers(ctx.input.orgHandle, {
      limit: ctx.input.limit,
      nextToken: ctx.input.nextToken
    });

    return {
      output: {
        members: result.items,
        nextToken: result.nextToken
      },
      message: `Found **${result.items.length}** member(s) in organization **${ctx.input.orgHandle}**${result.nextToken ? ' (more available)' : ''}.`
    };
  })
  .build();

export let manageOrgMember = SlateTool.create(spec, {
  name: 'Manage Organization Member',
  key: 'manage_org_member',
  description: `Add, update, or remove a member from an organization. Use action "add" to invite a new member, "update" to change their role, or "remove" to remove them.`
})
  .input(
    z.object({
      orgHandle: z.string().describe('Organization handle'),
      action: z.enum(['add', 'update', 'remove']).describe('Action to perform on the member'),
      userHandle: z.string().describe('Handle of the user to manage'),
      role: z
        .string()
        .optional()
        .describe(
          'Role to assign (required for add and update actions, e.g. "member", "owner")'
        )
    })
  )
  .output(memberSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let member: any;

    if (ctx.input.action === 'add') {
      if (!ctx.input.role) {
        throw new Error('Role is required when adding a member');
      }
      member = await client.addOrgMember(ctx.input.orgHandle, {
        handle: ctx.input.userHandle,
        role: ctx.input.role
      });
    } else if (ctx.input.action === 'update') {
      if (!ctx.input.role) {
        throw new Error('Role is required when updating a member');
      }
      member = await client.updateOrgMember(ctx.input.orgHandle, ctx.input.userHandle, {
        role: ctx.input.role
      });
    } else {
      member = await client.removeOrgMember(ctx.input.orgHandle, ctx.input.userHandle);
    }

    let actionVerb =
      ctx.input.action === 'add'
        ? 'Added'
        : ctx.input.action === 'update'
          ? 'Updated'
          : 'Removed';

    return {
      output: member,
      message: `${actionVerb} member **${ctx.input.userHandle}** in organization **${ctx.input.orgHandle}**.`
    };
  })
  .build();
