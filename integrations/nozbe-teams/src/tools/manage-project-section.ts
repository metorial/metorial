import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let sectionSchema = z.object({
  sectionId: z.string().describe('Section ID'),
  projectId: z.string().describe('Project this section belongs to'),
  name: z.string().describe('Section name'),
  position: z.number().optional().describe('Section position/order'),
  createdAt: z.number().optional().describe('Creation timestamp'),
  archivedAt: z.number().nullable().optional().describe('Archive timestamp (null if active)')
});

export let manageProjectSection = SlateTool.create(spec, {
  name: 'Manage Project Sections',
  key: 'manage_project_section',
  description: `List, create, update, or delete project sections in Nozbe Teams. Sections organize tasks within a project into groups.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(10000)
        .optional()
        .describe('Maximum sections for list action'),
      offset: z.number().int().min(0).optional().describe('Sections to skip for list action'),
      projectId: z.string().optional().describe('Project ID (required for list and create)'),
      sectionId: z.string().optional().describe('Section ID (required for update and delete)'),
      name: z
        .string()
        .optional()
        .describe('Section name (required for create, optional for update)'),
      position: z.number().optional().describe('Section position/order'),
      archivedAt: z
        .number()
        .nullable()
        .optional()
        .describe('Set archive timestamp to archive, null to unarchive')
    })
  )
  .output(
    z.object({
      sections: z
        .array(sectionSchema)
        .optional()
        .describe('List of sections (for list action)'),
      section: sectionSchema.optional().describe('Created or updated section'),
      deleted: z.boolean().optional().describe('Whether deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      if (!ctx.input.projectId)
        throw createApiServiceError('projectId is required for list action');

      let sections = await client.listProjectSections({
        project_id: ctx.input.projectId,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      let mapped = sections.map((s: any) => ({
        sectionId: s.id,
        projectId: s.project_id,
        name: s.name,
        position: s.position,
        createdAt: s.created_at,
        archivedAt: s.archived_at
      }));

      return {
        output: { sections: mapped },
        message: `Found **${mapped.length}** section(s) in project ${ctx.input.projectId}.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.projectId)
        throw createApiServiceError('projectId is required for create action');
      if (!ctx.input.name) throw createApiServiceError('name is required for create action');

      let data: Record<string, unknown> = {
        project_id: ctx.input.projectId,
        name: ctx.input.name
      };
      if (ctx.input.position !== undefined) data.position = ctx.input.position;

      let section = await client.createProjectSection(data);

      return {
        output: {
          section: {
            sectionId: section.id,
            projectId: section.project_id,
            name: section.name,
            position: section.position,
            createdAt: section.created_at,
            archivedAt: section.archived_at
          }
        },
        message: `Created section **${section.name}** (ID: ${section.id}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.sectionId)
        throw createApiServiceError('sectionId is required for update action');

      let data: Record<string, unknown> = {};
      if (ctx.input.name !== undefined) data.name = ctx.input.name;
      if (ctx.input.position !== undefined) data.position = ctx.input.position;
      if (ctx.input.archivedAt !== undefined) data.archived_at = ctx.input.archivedAt;

      if (Object.keys(data).length === 0) {
        throw createApiServiceError('Provide at least one field to update the section.');
      }

      let section = await client.updateProjectSection(ctx.input.sectionId, data);

      return {
        output: {
          section: {
            sectionId: section.id,
            projectId: section.project_id,
            name: section.name,
            position: section.position,
            createdAt: section.created_at,
            archivedAt: section.archived_at
          }
        },
        message: `Updated section **${section.name}** (ID: ${section.id}).`
      };
    }

    // delete
    if (!ctx.input.sectionId)
      throw createApiServiceError('sectionId is required for delete action');

    await client.deleteProjectSection(ctx.input.sectionId);

    return {
      output: { deleted: true },
      message: `Deleted section **${ctx.input.sectionId}**.`
    };
  })
  .build();
