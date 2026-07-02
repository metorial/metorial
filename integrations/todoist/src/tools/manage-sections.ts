import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let sectionSchema = z.object({
  sectionId: z.string().describe('Section ID'),
  name: z.string().describe('Section name'),
  projectId: z.string().describe('Parent project ID'),
  order: z.number().describe('Display order')
});

export let getSections = SlateTool.create(spec, {
  name: 'Get Sections',
  key: 'get_sections',
  description: `List sections within a project or retrieve a specific section by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sectionId: z.string().optional().describe('Specific section ID to retrieve'),
      projectId: z.string().optional().describe('Project ID to list sections for')
    })
  )
  .output(
    z.object({
      sections: z.array(sectionSchema).describe('Retrieved sections')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.sectionId) {
      let section = await client.getSection(ctx.input.sectionId);
      return {
        output: {
          sections: [
            {
              sectionId: section.id,
              name: section.name,
              projectId: section.projectId,
              order: section.order
            }
          ]
        },
        message: `Retrieved section **"${section.name}"**.`
      };
    }

    let sections = await client.getSections(ctx.input.projectId);
    return {
      output: {
        sections: sections.map(s => ({
          sectionId: s.id,
          name: s.name,
          projectId: s.projectId,
          order: s.order
        }))
      },
      message: `Retrieved **${sections.length}** section(s).`
    };
  });

export let createSection = SlateTool.create(spec, {
  name: 'Create Section',
  key: 'create_section',
  description: `Create a new section within a project to organize tasks into groups.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Section name'),
      projectId: z.string().describe('Project ID to create section in'),
      order: z.number().optional().describe('Position order')
    })
  )
  .output(sectionSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let section = await client.createSection(ctx.input);

    return {
      output: {
        sectionId: section.id,
        name: section.name,
        projectId: section.projectId,
        order: section.order
      },
      message: `Created section **"${section.name}"** (ID: ${section.id}).`
    };
  });

export let updateSection = SlateTool.create(spec, {
  name: 'Update Section',
  key: 'update_section',
  description: `Rename an existing section.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sectionId: z.string().describe('Section ID to update'),
      name: z.string().describe('New section name')
    })
  )
  .output(sectionSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let section = await client.updateSection(ctx.input.sectionId, { name: ctx.input.name });

    return {
      output: {
        sectionId: section.id,
        name: section.name,
        projectId: section.projectId,
        order: section.order
      },
      message: `Updated section to **"${section.name}"** (ID: ${section.id}).`
    };
  });

export let deleteSection = SlateTool.create(spec, {
  name: 'Delete Section',
  key: 'delete_section',
  description: `Permanently delete a section. Tasks in the section are moved to the project root.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      sectionId: z.string().describe('Section ID to delete')
    })
  )
  .output(
    z.object({
      sectionId: z.string().describe('Deleted section ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteSection(ctx.input.sectionId);

    return {
      output: { sectionId: ctx.input.sectionId },
      message: `Deleted section (ID: ${ctx.input.sectionId}).`
    };
  });
