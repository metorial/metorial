import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getCourse = SlateTool.create(spec, {
  name: 'Get Course',
  key: 'get_course',
  description: `Retrieve details for a Brightspace course offering by its org unit ID, including name, code, dates, active status, and course template information.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('The org unit ID of the course offering')
    })
  )
  .output(
    z.object({
      orgUnitId: z.string().describe('Course org unit ID'),
      name: z.string().optional().describe('Course name'),
      code: z.string().optional().describe('Course code'),
      isActive: z.boolean().optional().describe('Whether the course is active'),
      startDate: z.string().optional().describe('Course start date'),
      endDate: z.string().optional().describe('Course end date'),
      path: z.string().optional().describe('Course path'),
      courseTemplateId: z.string().optional().describe('Course template ID'),
      semesterId: z.string().optional().describe('Semester ID'),
      departmentId: z.string().optional().describe('Department ID'),
      description: z.string().optional().describe('Course description text'),
      canSelfRegister: z.boolean().optional().describe('Whether self-registration is enabled')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let course = await client.getCourse(ctx.input.orgUnitId);

    return {
      output: {
        orgUnitId: String(course.Identifier),
        name: course.Name,
        code: course.Code,
        isActive: course.IsActive,
        startDate: course.StartDate,
        endDate: course.EndDate,
        path: course.Path,
        courseTemplateId: course.CourseTemplate?.Identifier
          ? String(course.CourseTemplate.Identifier)
          : undefined,
        semesterId: course.Semester?.Identifier
          ? String(course.Semester.Identifier)
          : undefined,
        departmentId: course.Department?.Identifier
          ? String(course.Department.Identifier)
          : undefined,
        description: course.Description?.Text || course.Description?.Content,
        canSelfRegister: course.CanSelfRegister
      },
      message: `Retrieved course **${course.Name}** (${course.Code}, ID: ${course.Identifier}).`
    };
  })
  .build();

export let createCourse = SlateTool.create(spec, {
  name: 'Create Course',
  key: 'create_course',
  description: `Create a new course offering in Brightspace. Requires a name, code, and course template ID. Optionally specify semester, dates, and description.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Course offering name'),
      code: z.string().describe('Course code (max 50 characters)'),
      courseTemplateId: z.number().describe('Course template ID to base the offering on'),
      semesterId: z.number().optional().describe('Semester org unit ID'),
      startDate: z.string().optional().describe('Course start date (ISO 8601)'),
      endDate: z.string().optional().describe('Course end date (ISO 8601)'),
      description: z.string().optional().describe('Course description (HTML supported)'),
      canSelfRegister: z.boolean().optional().describe('Allow self-registration'),
      path: z.string().optional().describe('Course path'),
      forceLocale: z.boolean().optional().describe('Force locale setting')
    })
  )
  .output(
    z.object({
      orgUnitId: z.string().describe('New course org unit ID'),
      name: z.string().describe('Course name'),
      code: z.string().describe('Course code')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let course = await client.createCourse({
      Name: ctx.input.name,
      Code: ctx.input.code,
      CourseTemplateId: ctx.input.courseTemplateId,
      SemesterId: ctx.input.semesterId || null,
      StartDate: ctx.input.startDate || null,
      EndDate: ctx.input.endDate || null,
      Description: ctx.input.description
        ? { Content: ctx.input.description, Type: 'Html' }
        : null,
      CanSelfRegister: ctx.input.canSelfRegister,
      Path: ctx.input.path,
      ForceLocale: ctx.input.forceLocale
    });

    return {
      output: {
        orgUnitId: String(course.Identifier),
        name: course.Name,
        code: course.Code
      },
      message: `Created course **${course.Name}** (${course.Code}, ID: ${course.Identifier}).`
    };
  })
  .build();

export let updateCourse = SlateTool.create(spec, {
  name: 'Update Course',
  key: 'update_course',
  description: `Update an existing course offering's name, code, dates, active status, description, or self-registration setting. Only provide the fields you want to change.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('Course org unit ID to update'),
      name: z.string().optional().describe('Updated course name'),
      code: z.string().optional().describe('Updated course code'),
      startDate: z.string().optional().describe('Updated start date (ISO 8601)'),
      endDate: z.string().optional().describe('Updated end date (ISO 8601)'),
      isActive: z.boolean().optional().describe('Set course active/inactive'),
      description: z.string().optional().describe('Updated description (HTML supported)'),
      canSelfRegister: z.boolean().optional().describe('Allow self-registration')
    })
  )
  .output(
    z.object({
      orgUnitId: z.string().describe('Updated course org unit ID'),
      name: z.string().optional().describe('Course name'),
      code: z.string().optional().describe('Course code')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let updateData: any = {};
    if (ctx.input.name !== undefined) updateData.Name = ctx.input.name;
    if (ctx.input.code !== undefined) updateData.Code = ctx.input.code;
    if (ctx.input.startDate !== undefined) updateData.StartDate = ctx.input.startDate;
    if (ctx.input.endDate !== undefined) updateData.EndDate = ctx.input.endDate;
    if (ctx.input.isActive !== undefined) updateData.IsActive = ctx.input.isActive;
    if (ctx.input.description !== undefined)
      updateData.Description = { Content: ctx.input.description, Type: 'Html' };
    if (ctx.input.canSelfRegister !== undefined)
      updateData.CanSelfRegister = ctx.input.canSelfRegister;

    let course = await client.updateCourse(ctx.input.orgUnitId, updateData);

    return {
      output: {
        orgUnitId: String(course.Identifier),
        name: course.Name,
        code: course.Code
      },
      message: `Updated course **${course.Name}** (ID: ${course.Identifier}).`
    };
  })
  .build();

export let deleteCourse = SlateTool.create(spec, {
  name: 'Delete Course',
  key: 'delete_course',
  description: `Permanently delete a course offering from Brightspace by its org unit ID.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('Course org unit ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.deleteCourse(ctx.input.orgUnitId);

    return {
      output: { success: true },
      message: `Deleted course offering (ID: ${ctx.input.orgUnitId}).`
    };
  })
  .build();
