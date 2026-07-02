import { SlateTool } from 'slates';
import { z } from 'zod';
import { EverhourClient } from '../lib/client';
import { spec } from '../spec';

let sectionSchema = z.object({
  sectionId: z.number().describe('Section ID'),
  name: z.string().describe('Section name'),
  projectId: z.string().optional().describe('Parent project ID'),
  position: z.number().optional().describe('Section position'),
  status: z.string().optional().describe('Section status: open or archived')
});

export let listSections = SlateTool.create(spec, {
  name: 'List Sections',
  key: 'list_sections',
  description: `List all sections (columns) within a project. Sections are used to organize tasks.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      projectId: z.string().describe('Project ID to list sections from')
    })
  )
  .output(
    z.object({
      sections: z.array(sectionSchema).describe('List of sections')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    let sections = await client.listSections(ctx.input.projectId);
    let mapped = (Array.isArray(sections) ? sections : []).map((s: any) => ({
      sectionId: s.id,
      name: s.name,
      projectId: s.project,
      position: s.position,
      status: s.status
    }));
    return {
      output: { sections: mapped },
      message: `Found **${mapped.length}** section(s).`
    };
  });

export let createSection = SlateTool.create(spec, {
  name: 'Create Section',
  key: 'create_section',
  description: `Create a new section (column) in a project for organizing tasks.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      projectId: z.string().describe('Project ID to create the section in'),
      name: z.string().describe('Section name'),
      position: z.number().optional().describe('Section position')
    })
  )
  .output(sectionSchema)
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    let s = await client.createSection(ctx.input.projectId, {
      name: ctx.input.name,
      position: ctx.input.position
    });
    return {
      output: {
        sectionId: s.id,
        name: s.name,
        projectId: s.project,
        position: s.position,
        status: s.status
      },
      message: `Created section **${s.name}**.`
    };
  });

export let updateSection = SlateTool.create(spec, {
  name: 'Update Section',
  key: 'update_section',
  description: `Update a section's name, position, or status (open/archived).`,
  tags: { destructive: false }
})
  .input(
    z.object({
      sectionId: z.number().describe('Section ID to update'),
      name: z.string().optional().describe('New section name'),
      position: z.number().optional().describe('New position'),
      status: z.enum(['open', 'archived']).optional().describe('Section status')
    })
  )
  .output(sectionSchema)
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    let { sectionId, ...data } = ctx.input;
    let s = await client.updateSection(sectionId, data);
    return {
      output: {
        sectionId: s.id,
        name: s.name,
        projectId: s.project,
        position: s.position,
        status: s.status
      },
      message: `Updated section **${s.name}**.`
    };
  });

export let deleteSection = SlateTool.create(spec, {
  name: 'Delete Section',
  key: 'delete_section',
  description: `Delete a section from a project.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      sectionId: z.number().describe('Section ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    await client.deleteSection(ctx.input.sectionId);
    return {
      output: { success: true },
      message: `Deleted section ${ctx.input.sectionId}.`
    };
  });
