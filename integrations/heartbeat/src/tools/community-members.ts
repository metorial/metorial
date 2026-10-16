import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { CommunityClient } from '../lib/client';
import {
  type Member,
  memberSchema,
  mutationSchema,
  type Role,
  roleSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let listCommunityMembers = SlateTool.create(spec, {
  key: 'list_community_members',
  name: 'List Community Members',
  description:
    'List all members returned by the Heartbeat community API, including role names and group memberships. This endpoint is not paginated.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(z.object({ users: z.array(memberSchema) }))
  .handleInvocation(async ctx => {
    let users = await new CommunityClient(ctx.auth.token).request<Member[]>('GET', '/users');
    return { output: { users }, message: `Retrieved ${users.length} community member(s).` };
  })
  .build();

export let findMembers = SlateTool.create(spec, {
  key: 'find_members',
  name: 'Find Members',
  description:
    'Find community members by email, or retrieve one member by user ID. Returns the complete documented profile and additional provider metadata.',
  instructions: ['Provide userId or email. When both are provided, userId takes precedence.'],
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ userId: z.string().optional(), email: z.string().optional() }))
  .output(z.object({ users: z.array(memberSchema) }))
  .handleInvocation(async ctx => {
    let client = new CommunityClient(ctx.auth.token);
    if (ctx.input.userId) {
      let user = await client.request<Member>(
        'GET',
        `/users/${encodeURIComponent(ctx.input.userId)}`
      );
      return {
        output: { users: [user] },
        message: 'Retrieved the requested community member.'
      };
    }
    if (!ctx.input.email)
      throw createApiServiceError('Provide userId or email to find a member.');
    let users = await client.request<Member[]>('GET', '/find/users', undefined, {
      email: ctx.input.email
    });
    return { output: { users }, message: `Retrieved ${users.length} matching member(s).` };
  })
  .build();

export let listRoles = SlateTool.create(spec, {
  key: 'list_roles',
  name: 'List Roles',
  description:
    'Discover the community role IDs and names needed to provision members or create invitation links.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(z.object({ roles: z.array(roleSchema) }))
  .handleInvocation(async ctx => {
    let roles = await new CommunityClient(ctx.auth.token).request<Role[]>('GET', '/roles');
    return { output: { roles }, message: `Retrieved ${roles.length} role(s).` };
  })
  .build();

export let provisionMember = SlateTool.create(spec, {
  key: 'provision_member',
  name: 'Provision Member',
  description:
    'Create a community member with a full name and a role. Discover role IDs with list_roles and group IDs with list_access_groups. Returns the actual HTTP status and provider response without assuming a profile was returned.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      email: z.string(),
      name: z.string().describe('Full name of the member'),
      roleId: z.string().describe('Role ID from list_roles'),
      groupIds: z.array(z.string()).optional().describe('Group IDs from list_access_groups'),
      profilePicture: z.string().optional().describe('A JPG, GIF, or PNG data URI'),
      bio: z.string().optional(),
      status: z.string().optional(),
      linkedin: z.string().optional(),
      twitter: z.string().optional(),
      instagram: z.string().optional(),
      website: z.string().optional(),
      createIntroductionThread: z.boolean().optional()
    })
  )
  .output(mutationSchema)
  .handleInvocation(async ctx => {
    let { roleId, groupIds, ...profile } = ctx.input;
    let output = await new CommunityClient(ctx.auth.token).mutate('PUT', '/users', {
      ...profile,
      roleID: roleId,
      groupIDs: groupIds
    });
    return { output, message: 'Heartbeat accepted the member creation request.' };
  })
  .build();

export let editMemberProfile = SlateTool.create(spec, {
  key: 'edit_member_profile',
  name: 'Edit Member Profile',
  description:
    'Update a member profile using their existing email address. This operation does not change the member email, role, or groups. Use manage_group_memberships for group membership changes.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      email: z.string().describe('Existing member email; identifies the member to update'),
      name: z.string().optional(),
      profilePicture: z.string().optional().describe('A JPG, GIF, or PNG data URI'),
      bio: z.string().optional(),
      status: z.string().optional(),
      linkedin: z.string().optional(),
      twitter: z.string().optional(),
      instagram: z.string().optional(),
      completedLessons: z
        .array(
          z.object({
            lessonId: z.string(),
            timestamp: z.string().describe('Completion timestamp in ISO 8601 format')
          })
        )
        .optional()
        .describe('Lessons to add to the completed list; existing completions are retained')
    })
  )
  .output(mutationSchema)
  .handleInvocation(async ctx => {
    let { completedLessons, ...profile } = ctx.input;
    let output = await new CommunityClient(ctx.auth.token).mutate('POST', '/users', {
      ...profile,
      completedLessons: completedLessons?.map(lesson => ({
        lessonID: lesson.lessonId,
        timestamp: lesson.timestamp
      }))
    });
    return { output, message: 'Heartbeat accepted the member profile update request.' };
  })
  .build();

export let changeMemberAccess = SlateTool.create(spec, {
  key: 'change_member_access',
  name: 'Change Member Access',
  description:
    'Deactivate or reactivate a member by email. Deactivation removes community access while preserving threads, comments, and messages.',
  tags: { readOnly: false, destructive: true }
})
  .input(z.object({ email: z.string(), action: z.enum(['deactivate', 'reactivate']) }))
  .output(mutationSchema)
  .handleInvocation(async ctx => {
    let output = await new CommunityClient(ctx.auth.token).mutate(
      ctx.input.action === 'deactivate' ? 'DELETE' : 'POST',
      ctx.input.action === 'deactivate' ? '/users' : '/users/reactivate',
      { email: ctx.input.email }
    );
    return { output, message: 'Heartbeat accepted the member access change request.' };
  })
  .build();
