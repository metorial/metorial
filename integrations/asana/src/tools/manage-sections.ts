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
