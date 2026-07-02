import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSections = SlateTool.create(spec, {
  name: 'List Sections',
  key: 'list_sections',
  description: `List all sections in a project. Sections are used to organize tasks within a project.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('Project GID')
    })
  )
  .output(
    z.object({
      sections: z.array(
        z.object({
          sectionId: z.string(),
          name: z.string(),
          createdAt: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listSections(ctx.input.projectId);
    let sections = (result.data || []).map((s: any) => ({
      sectionId: s.gid,
      name: s.name,
      createdAt: s.created_at
    }));

    return {
      output: { sections },
      message: `Found **${sections.length}** section(s).`
    };
  })
  .build();

export let createSection = SlateTool.create(spec, {
  name: 'Create Section',
  key: 'create_section',
  description: `Create a new section in a project. Optionally specify position relative to existing sections.`
})
  .input(
    z.object({
      projectId: z.string().describe('Project GID'),
      name: z.string().describe('Section name'),
      insertBefore: z.string().optional().describe('Section GID to insert before'),
      insertAfter: z.string().optional().describe('Section GID to insert after')
    })
  )
  .output(
    z.object({
      sectionId: z.string(),
      name: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let section = await client.createSection(
      ctx.input.projectId,
      ctx.input.name,
      ctx.input.insertBefore,
      ctx.input.insertAfter
    );

    return {
      output: {
        sectionId: section.gid,
        name: section.name
      },
      message: `Created section **${section.name}** (${section.gid}).`
    };
  })
  .build();

export let updateSection = SlateTool.create(spec, {
  name: 'Update Section',
  key: 'update_section',
  description: `Rename an existing project section.`
})
  .input(
    z.object({
      sectionId: z.string().describe('Section GID to update'),
      name: z.string().describe('New section name')
    })
  )
  .output(
    z.object({
      sectionId: z.string(),
      name: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let section = await client.updateSection(ctx.input.sectionId, ctx.input.name);

    return {
      output: {
        sectionId: section.gid,
        name: section.name
      },
      message: `Updated section **${section.name}** (${section.gid}).`
    };
  })
  .build();

export let deleteSection = SlateTool.create(spec, {
  name: 'Delete Section',
  key: 'delete_section',
  description: `Delete an empty project section. Asana does not allow deleting the last remaining section.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      sectionId: z.string().describe('Section GID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteSection(ctx.input.sectionId);

    return {
      output: { deleted: true },
      message: `Deleted section ${ctx.input.sectionId}.`
    };
  })
  .build();
