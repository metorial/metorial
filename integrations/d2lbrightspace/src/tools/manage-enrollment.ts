import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let enrollmentSchema = z.object({
  orgUnitId: z.string().optional().describe('Org unit ID'),
  userId: z.string().optional().describe('User ID'),
  roleId: z.string().optional().describe('Role ID'),
  orgUnitName: z.string().optional().describe('Org unit name'),
  roleName: z.string().optional().describe('Role name')
});

export let enrollUser = SlateTool.create(spec, {
  name: 'Enroll User',
  key: 'enroll_user',
  description: `Enroll a user in a course or org unit with a specific role. Use the **List Roles** tool to find valid role IDs.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      orgUnitId: z.number().describe('Org unit (course) ID to enroll the user in'),
      userId: z.number().describe('User ID to enroll'),
      roleId: z.number().describe('Role ID for the enrollment')
    })
  )
  .output(
    z.object({
      orgUnitId: z.string().describe('Org unit ID'),
      userId: z.string().describe('Enrolled user ID'),
      roleId: z.string().describe('Assigned role ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let enrollment = await client.createEnrollment({
      OrgUnitId: ctx.input.orgUnitId,
      UserId: ctx.input.userId,
      RoleId: ctx.input.roleId
    });

    return {
      output: {
        orgUnitId: String(enrollment.OrgUnitId),
        userId: String(enrollment.UserId),
        roleId: String(enrollment.RoleId)
      },
      message: `Enrolled user **${enrollment.UserId}** in org unit **${enrollment.OrgUnitId}** with role **${enrollment.RoleId}**.`
    };
  })
  .build();

export let unenrollUser = SlateTool.create(spec, {
  name: 'Unenroll User',
  key: 'unenroll_user',
  description: `Remove a user's enrollment from a course or org unit.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('Org unit (course) ID to unenroll from'),
      userId: z.string().describe('User ID to unenroll')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the unenrollment was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.deleteEnrollment(ctx.input.orgUnitId, ctx.input.userId);

    return {
      output: { success: true },
      message: `Unenrolled user **${ctx.input.userId}** from org unit **${ctx.input.orgUnitId}**.`
    };
  })
  .build();

export let listEnrollments = SlateTool.create(spec, {
  name: 'List Enrollments',
  key: 'list_enrollments',
  description: `List enrollments for a specific user or org unit. Provide either a userId to see all their enrollments, or an orgUnitId to see all enrolled users.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      userId: z.string().optional().describe('User ID to list enrollments for'),
      orgUnitId: z.string().optional().describe('Org unit ID to list enrolled users for'),
      roleId: z.string().optional().describe('Filter by role ID'),
      bookmark: z.string().optional().describe('Pagination bookmark')
    })
  )
  .output(
    z.object({
      enrollments: z.array(enrollmentSchema).describe('List of enrollments'),
      nextBookmark: z.string().optional().describe('Bookmark for the next page'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    if (ctx.input.orgUnitId) {
      let result = await client.getOrgUnitEnrollments(ctx.input.orgUnitId, {
        roleId: ctx.input.roleId,
        bookmark: ctx.input.bookmark
      });

      let items = result?.Items || (Array.isArray(result) ? result : []);
      let enrollments = items.map((e: any) => ({
        orgUnitId: ctx.input.orgUnitId,
        userId: String(e.User?.Identifier),
        roleId: String(e.Role?.Id),
        roleName: e.Role?.Name
      }));

      return {
        output: {
          enrollments,
          nextBookmark: result?.PagingInfo?.Bookmark || undefined,
          hasMore: result?.PagingInfo?.HasMoreItems || false
        },
        message: `Found **${enrollments.length}** enrollment(s) in org unit ${ctx.input.orgUnitId}.`
      };
    }

    if (ctx.input.userId) {
      let result = await client.getUserEnrollments(ctx.input.userId, {
        roleId: ctx.input.roleId,
        bookmark: ctx.input.bookmark
      });

      let items = result?.Items || (Array.isArray(result) ? result : []);
      let enrollments = items.map((e: any) => ({
        orgUnitId: String(e.OrgUnit?.Id),
        orgUnitName: e.OrgUnit?.Name,
        userId: ctx.input.userId,
        roleId: String(e.Role?.Id),
        roleName: e.Role?.Name
      }));

      return {
        output: {
          enrollments,
          nextBookmark: result?.PagingInfo?.Bookmark || undefined,
          hasMore: result?.PagingInfo?.HasMoreItems || false
        },
        message: `Found **${enrollments.length}** enrollment(s) for user ${ctx.input.userId}.`
      };
    }

    let result = await client.getMyEnrollments({
      bookmark: ctx.input.bookmark
    });

    let items = result?.Items || (Array.isArray(result) ? result : []);
    let enrollments = items.map((e: any) => ({
      orgUnitId: String(e.OrgUnit?.Id),
      orgUnitName: e.OrgUnit?.Name
    }));

    return {
      output: {
        enrollments,
        nextBookmark: result?.PagingInfo?.Bookmark || undefined,
        hasMore: result?.PagingInfo?.HasMoreItems || false
      },
      message: `Found **${enrollments.length}** enrollment(s) for the current user.`
    };
  })
  .build();

export let getClasslist = SlateTool.create(spec, {
  name: 'Get Classlist',
  key: 'get_classlist',
  description: `Retrieve the classlist (enrolled users) for a course. Returns user details including names, emails, and role information.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('Course org unit ID')
    })
  )
  .output(
    z.object({
      students: z
        .array(
          z.object({
            userId: z.string().describe('User ID'),
            userName: z.string().optional().describe('Username'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            email: z.string().optional().describe('Email'),
            orgDefinedId: z.string().optional().describe('Org-defined ID'),
            roleId: z.string().optional().describe('Role ID')
          })
        )
        .describe('List of enrolled users')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let classlist = await client.getClasslist(ctx.input.orgUnitId);

    let items = Array.isArray(classlist) ? classlist : classlist?.Items || [];
    let students = items.map((s: any) => ({
      userId: String(s.Identifier),
      userName: s.Username,
      firstName: s.FirstName,
      lastName: s.LastName,
      email: s.Email,
      orgDefinedId: s.OrgDefinedId,
      roleId: s.RoleId ? String(s.RoleId) : undefined
    }));

    return {
      output: { students },
      message: `Retrieved classlist with **${students.length}** student(s) for org unit ${ctx.input.orgUnitId}.`
    };
  })
  .build();
