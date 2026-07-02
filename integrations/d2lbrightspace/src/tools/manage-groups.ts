import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listGroupsAndSections = SlateTool.create(spec, {
  name: 'List Groups and Sections',
  key: 'list_groups_sections',
  description: `List group categories, groups within a category, or sections within a course. Use this to explore the group/section structure of a course.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('Course org unit ID'),
      groupCategoryId: z
        .string()
        .optional()
        .describe('If provided, lists groups within this category'),
      listSections: z
        .boolean()
        .optional()
        .describe('If true, lists sections instead of groups')
    })
  )
  .output(
    z.object({
      groupCategories: z
        .array(
          z.object({
            groupCategoryId: z.string().describe('Category ID'),
            name: z.string().optional().describe('Category name'),
            description: z.string().optional().describe('Category description'),
            maxUsersPerGroup: z.number().optional().describe('Max users per group')
          })
        )
        .optional()
        .describe('Group categories (when no groupCategoryId provided)'),
      groups: z
        .array(
          z.object({
            groupId: z.string().describe('Group ID'),
            name: z.string().optional().describe('Group name'),
            code: z.string().optional().describe('Group code'),
            description: z.string().optional().describe('Group description'),
            enrollmentCount: z.number().optional().describe('Number of enrolled users')
          })
        )
        .optional()
        .describe('Groups within a category'),
      sections: z
        .array(
          z.object({
            sectionId: z.string().describe('Section ID'),
            name: z.string().optional().describe('Section name'),
            code: z.string().optional().describe('Section code'),
            description: z.string().optional().describe('Section description'),
            enrollmentCount: z.number().optional().describe('Number of enrolled users')
          })
        )
        .optional()
        .describe('Sections')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    if (ctx.input.listSections) {
      let result = await client.listSections(ctx.input.orgUnitId);
      let items = Array.isArray(result) ? result : [];
      let sections = items.map((s: any) => ({
        sectionId: String(s.SectionId),
        name: s.Name,
        code: s.Code,
        description: s.Description?.Text || s.Description?.Content,
        enrollmentCount: s.Enrollments?.length
      }));

      return {
        output: { sections },
        message: `Found **${sections.length}** section(s).`
      };
    }

    if (ctx.input.groupCategoryId) {
      let result = await client.listGroups(ctx.input.orgUnitId, ctx.input.groupCategoryId);
      let items = Array.isArray(result) ? result : [];
      let groups = items.map((g: any) => ({
        groupId: String(g.GroupId),
        name: g.Name,
        code: g.Code,
        description: g.Description?.Text || g.Description?.Content,
        enrollmentCount: g.Enrollments?.length
      }));

      return {
        output: { groups },
        message: `Found **${groups.length}** group(s) in category ${ctx.input.groupCategoryId}.`
      };
    }

    let result = await client.listGroupCategories(ctx.input.orgUnitId);
    let items = Array.isArray(result) ? result : [];
    let groupCategories = items.map((c: any) => ({
      groupCategoryId: String(c.GroupCategoryId),
      name: c.Name,
      description: c.Description?.Text || c.Description?.Content,
      maxUsersPerGroup: c.MaxUsersPerGroup
    }));

    return {
      output: { groupCategories },
      message: `Found **${groupCategories.length}** group categorie(s).`
    };
  })
  .build();

export let manageGroupEnrollment = SlateTool.create(spec, {
  name: 'Manage Group Enrollment',
  key: 'manage_group_enrollment',
  description: `Add or remove a user from a group within a course. Specify the action as "enroll" or "unenroll".`,
  tags: { destructive: false }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('Course org unit ID'),
      groupCategoryId: z.string().describe('Group category ID'),
      groupId: z.string().describe('Group ID'),
      userId: z.number().describe('User ID'),
      action: z.enum(['enroll', 'unenroll']).describe('Action to perform')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    if (ctx.input.action === 'enroll') {
      await client.enrollUserInGroup(
        ctx.input.orgUnitId,
        ctx.input.groupCategoryId,
        ctx.input.groupId,
        ctx.input.userId
      );
      return {
        output: { success: true },
        message: `Enrolled user **${ctx.input.userId}** in group ${ctx.input.groupId}.`
      };
    }

    await client.removeUserFromGroup(
      ctx.input.orgUnitId,
      ctx.input.groupCategoryId,
      ctx.input.groupId,
      String(ctx.input.userId)
    );
    return {
      output: { success: true },
      message: `Removed user **${ctx.input.userId}** from group ${ctx.input.groupId}.`
    };
  })
  .build();
