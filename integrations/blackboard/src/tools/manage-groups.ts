import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let groupOutputSchema = z.object({
  groupId: z.string().describe('Group ID'),
  name: z.string().describe('Group name'),
  description: z.string().optional().describe('Group description'),
  externalId: z.string().optional().describe('External identifier'),
  groupSetId: z.string().optional().describe('Group set ID'),
  available: z.string().optional().describe('Availability status'),
  enrollmentType: z.string().optional().describe('Enrollment type'),
  created: z.string().optional().describe('Creation timestamp'),
  modified: z.string().optional().describe('Last modified timestamp')
});

let mapGroup = (g: any) => ({
  groupId: g.id,
  name: g.name,
  description: g.description,
  externalId: g.externalId,
  groupSetId: g.groupSetId,
  available: g.availability?.available,
  enrollmentType: g.enrollment?.type,
  created: g.created,
  modified: g.modified
});

export let createGroup = SlateTool.create(spec, {
  name: 'Create Course Group',
  key: 'create_group',
  description: `Create a group within a course. Groups enable collaborative work among course members. Configure enrollment type and member limits.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      courseId: z.string().describe('Course identifier'),
      name: z.string().describe('Group name'),
      description: z.string().optional().describe('Group description'),
      externalId: z.string().optional().describe('External identifier'),
      available: z.enum(['Yes', 'No']).optional().describe('Whether the group is available'),
      enrollmentType: z
        .enum(['InstructorOnly', 'SelfEnrollment', 'SignupSheet'])
        .optional()
        .describe('How members can join'),
      memberLimit: z.number().optional().describe('Maximum number of members')
    })
  )
  .output(groupOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let group = await client.createCourseGroup(ctx.input.courseId, {
      name: ctx.input.name,
      description: ctx.input.description,
      externalId: ctx.input.externalId,
      availability: ctx.input.available ? { available: ctx.input.available } : undefined,
      enrollment:
        ctx.input.enrollmentType || ctx.input.memberLimit
          ? {
              type: ctx.input.enrollmentType,
              limit: ctx.input.memberLimit
            }
          : undefined
    });

    return {
      output: mapGroup(group),
      message: `Created group **${group.name}** in course **${ctx.input.courseId}**.`
    };
  })
  .build();

export let listGroups = SlateTool.create(spec, {
  name: 'List Course Groups',
  key: 'list_groups',
  description: `List all groups in a course.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      courseId: z.string().describe('Course identifier'),
      offset: z.number().optional().describe('Number of items to skip'),
      limit: z.number().optional().describe('Maximum results to return')
    })
  )
  .output(
    z.object({
      groups: z.array(groupOutputSchema),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let result = await client.listCourseGroups(ctx.input.courseId, {
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let groups = (result.results || []).map(mapGroup);
    return {
      output: { groups, hasMore: !!result.paging?.nextPage },
      message: `Found **${groups.length}** group(s).`
    };
  })
  .build();

export let updateGroup = SlateTool.create(spec, {
  name: 'Update Course Group',
  key: 'update_group',
  description: `Update a course group's properties.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      courseId: z.string().describe('Course identifier'),
      groupId: z.string().describe('Group ID'),
      name: z.string().optional().describe('New group name'),
      description: z.string().optional().describe('New description'),
      available: z.enum(['Yes', 'No']).optional().describe('Availability status')
    })
  )
  .output(groupOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let group = await client.updateCourseGroup(ctx.input.courseId, ctx.input.groupId, {
      name: ctx.input.name,
      description: ctx.input.description,
      availability: ctx.input.available ? { available: ctx.input.available } : undefined
    });

    return {
      output: mapGroup(group),
      message: `Updated group **${group.name}**.`
    };
  })
  .build();

export let deleteGroup = SlateTool.create(spec, {
  name: 'Delete Course Group',
  key: 'delete_group',
  description: `Delete a group from a course.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      courseId: z.string().describe('Course identifier'),
      groupId: z.string().describe('Group ID')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the group was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    await client.deleteCourseGroup(ctx.input.courseId, ctx.input.groupId);
    return {
      output: { deleted: true },
      message: `Deleted group **${ctx.input.groupId}**.`
    };
  })
  .build();

export let manageGroupMembers = SlateTool.create(spec, {
  name: 'Manage Group Members',
  key: 'manage_group_members',
  description: `Add or remove members from a course group. Use action "add" to add a user or "remove" to remove one. Use action "list" to see current members.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      courseId: z.string().describe('Course identifier'),
      groupId: z.string().describe('Group ID'),
      action: z.enum(['add', 'remove', 'list']).describe('Action to perform'),
      userId: z.string().optional().describe('User identifier (required for add/remove)'),
      offset: z.number().optional().describe('Pagination offset (for list action)'),
      limit: z.number().optional().describe('Pagination limit (for list action)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action succeeded'),
      members: z
        .array(
          z.object({
            userId: z.string(),
            courseId: z.string().optional()
          })
        )
        .optional()
        .describe('List of group members (for list action)'),
      hasMore: z.boolean().optional().describe('Whether more members are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listGroupMembers(ctx.input.courseId, ctx.input.groupId, {
        offset: ctx.input.offset,
        limit: ctx.input.limit
      });
      let members = (result.results || []).map(m => ({
        userId: m.userId,
        courseId: m.courseId
      }));
      return {
        output: { success: true, members, hasMore: !!result.paging?.nextPage },
        message: `Group has **${members.length}** member(s).`
      };
    }

    if (!ctx.input.userId) {
      throw new Error('userId is required for add/remove actions.');
    }

    if (ctx.input.action === 'add') {
      await client.addGroupMember(ctx.input.courseId, ctx.input.groupId, ctx.input.userId);
      return {
        output: { success: true },
        message: `Added user **${ctx.input.userId}** to group **${ctx.input.groupId}**.`
      };
    }

    await client.removeGroupMember(ctx.input.courseId, ctx.input.groupId, ctx.input.userId);
    return {
      output: { success: true },
      message: `Removed user **${ctx.input.userId}** from group **${ctx.input.groupId}**.`
    };
  })
  .build();
