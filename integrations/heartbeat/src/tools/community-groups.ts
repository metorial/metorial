import { SlateTool } from 'slates';
import { z } from 'zod';
import { CommunityClient } from '../lib/client';
import {
  type Group,
  groupSchema,
  type Invitation,
  invitationSchema,
  mutationSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let listAccessGroups = SlateTool.create(spec, {
  key: 'list_access_groups',
  name: 'List Access Groups',
  description:
    'List all community access groups, their parent IDs, archived state, and member information. This endpoint is not paginated.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(z.object({ groups: z.array(groupSchema) }))
  .handleInvocation(async ctx => {
    let groups = await new CommunityClient(ctx.auth.token).request<Group[]>('GET', '/groups');
    return { output: { groups }, message: `Retrieved ${groups.length} access group(s).` };
  })
  .build();

export let createAccessGroup = SlateTool.create(spec, {
  key: 'create_access_group',
  name: 'Create Access Group',
  description:
    'Create an access group, optionally assigning member emails and a parent group. Discover existing group IDs with list_access_groups. Returns the actual HTTP status and provider response.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      members: z.array(z.string()).optional().describe('Member email addresses'),
      parentGroupId: z.string().optional().describe('Parent ID from list_access_groups'),
      isIsolated: z.boolean().optional(),
      isJoinable: z.boolean().optional()
    })
  )
  .output(mutationSchema)
  .handleInvocation(async ctx => {
    let { parentGroupId, ...group } = ctx.input;
    let output = await new CommunityClient(ctx.auth.token).mutate('PUT', '/groups', {
      ...group,
      parentGroupID: parentGroupId
    });
    return { output, message: 'Heartbeat accepted the group creation request.' };
  })
  .build();

export let manageGroupMemberships = SlateTool.create(spec, {
  key: 'manage_group_memberships',
  name: 'Manage Group Memberships',
  description:
    'Add members to, or remove members from, an access group using email addresses. Discover the group ID with list_access_groups. Adding members can remove them from sibling groups.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      groupId: z.string().describe('Group ID from list_access_groups'),
      action: z.enum(['add', 'remove']),
      emails: z.array(z.string()),
      removeFromSiblingGroups: z.boolean().optional().describe('Only used when action is add')
    })
  )
  .output(mutationSchema)
  .handleInvocation(async ctx => {
    let data =
      ctx.input.action === 'add'
        ? {
            emails: ctx.input.emails,
            shouldRemoveFromSiblingGroups: ctx.input.removeFromSiblingGroups
          }
        : { emails: ctx.input.emails };
    let output = await new CommunityClient(ctx.auth.token).mutate(
      ctx.input.action === 'add' ? 'PUT' : 'DELETE',
      `/groups/${encodeURIComponent(ctx.input.groupId)}/memberships`,
      data
    );
    return { output, message: 'Heartbeat accepted the group membership change request.' };
  })
  .build();

export let listInvitations = SlateTool.create(spec, {
  key: 'list_invitations',
  name: 'List Invitation Links',
  description:
    'List community invitation links with their actual codes, roles, and groups. Invitation codes do not identify an API key or the current user.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(z.object({ invitations: z.array(invitationSchema) }))
  .handleInvocation(async ctx => {
    let invitations = await new CommunityClient(ctx.auth.token).request<Invitation[]>(
      'GET',
      '/invitations'
    );
    return {
      output: { invitations },
      message: `Retrieved ${invitations.length} invitation link(s).`
    };
  })
  .build();

export let createInvitationLink = SlateTool.create(spec, {
  key: 'create_invitation_link',
  name: 'Create Invitation Link',
  description:
    'Create an invitation link for a role and groups, returning the real invitation code and provider metadata. This operation creates a link and does not send an invitation email.',
  instructions: [
    'Discover role IDs with list_roles and group IDs with list_access_groups. Use the actual invitation code with your known community invitation page; no community URL is inferred.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      roleId: z.string().describe('Role ID from list_roles'),
      groupIds: z
        .array(z.string())
        .describe('Group IDs from list_access_groups; an empty array is allowed')
    })
  )
  .output(z.object({ invitation: invitationSchema }))
  .handleInvocation(async ctx => {
    let invitation = await new CommunityClient(ctx.auth.token).request<Invitation>(
      'PUT',
      '/invitations',
      {
        roleID: ctx.input.roleId,
        groupIDs: ctx.input.groupIds
      }
    );
    return {
      output: { invitation },
      message: 'Heartbeat returned the invitation link details.'
    };
  })
  .build();
