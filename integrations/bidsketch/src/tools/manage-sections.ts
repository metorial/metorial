import { SlateTool } from 'slates';
import { z } from 'zod';
import { BidsketchClient } from '../lib/client';
import { spec } from '../spec';

let sectionSchema = z.object({
  sectionId: z.number().describe('Unique section ID'),
  name: z.string().describe('Section name'),
  sectionType: z.string().describe('Section type: opening or closing'),
  category: z.string().nullable().describe('Category for grouping'),
  description: z.string().nullable().describe('Section content (HTML)'),
  url: z.string().describe('API URL'),
  appUrl: z.string().describe('Bidsketch app URL'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let listSections = SlateTool.create(spec, {
  name: 'List Sections',
  key: 'list_sections',
  description: `Retrieve reusable content sections saved to the Bidsketch library. These template sections can be added to proposals as opening or closing content. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of sections per page (max 100)')
    })
  )
  .output(
    z.object({
      sections: z.array(sectionSchema).describe('List of reusable sections')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BidsketchClient(ctx.auth.token);
    let data = await client.listSections(ctx.input.page, ctx.input.perPage);

    let sections = (Array.isArray(data) ? data : []).map((s: any) => ({
      sectionId: s.id,
      name: s.name,
      sectionType: s.sectiontype,
      category: s.category ?? null,
      description: s.description ?? null,
      url: s.url,
      appUrl: s.app_url,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }));

    return {
      output: { sections },
      message: `Found **${sections.length}** reusable section(s).`
    };
  })
  .build();

export let createSection = SlateTool.create(spec, {
  name: 'Create Section',
  key: 'create_section',
  description: `Create a new reusable content section in the Bidsketch library. Sections can be of type "opening" (shown before fees) or "closing" (shown after fees).`,
  instructions: ['Use HTML in the description for rich text formatting.']
})
  .input(
    z.object({
      name: z.string().describe('Section name'),
      sectionType: z
        .enum(['opening', 'closing'])
        .describe('Section type: opening (before fees) or closing (after fees)'),
      category: z.string().optional().describe('Category for grouping'),
      description: z.string().optional().describe('Section content (HTML supported)')
    })
  )
  .output(sectionSchema)
  .handleInvocation(async ctx => {
    let client = new BidsketchClient(ctx.auth.token);

    let body: Record<string, unknown> = {
      name: ctx.input.name,
      sectiontype: ctx.input.sectionType
    };

    if (ctx.input.category !== undefined) body.category = ctx.input.category;
    if (ctx.input.description !== undefined) body.description = ctx.input.description;

    let s = await client.createSection(body);

    return {
      output: {
        sectionId: s.id,
        name: s.name,
        sectionType: s.sectiontype,
        category: s.category ?? null,
        description: s.description ?? null,
        url: s.url,
        appUrl: s.app_url,
        createdAt: s.created_at,
        updatedAt: s.updated_at
      },
      message: `Created ${s.sectiontype} section **${s.name}** (ID: ${s.id}).`
    };
  })
  .build();

export let updateSection = SlateTool.create(spec, {
  name: 'Update Section',
  key: 'update_section',
  description: `Update an existing reusable content section in the Bidsketch library. Only the provided fields will be modified.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      sectionId: z.number().describe('ID of the section to update'),
      name: z.string().optional().describe('Updated name'),
      sectionType: z.enum(['opening', 'closing']).optional().describe('Updated section type'),
      category: z.string().optional().describe('Updated category'),
      description: z.string().optional().describe('Updated content (HTML)')
    })
  )
  .output(sectionSchema)
  .handleInvocation(async ctx => {
    let client = new BidsketchClient(ctx.auth.token);

    let body: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.sectionType !== undefined) body.sectiontype = ctx.input.sectionType;
    if (ctx.input.category !== undefined) body.category = ctx.input.category;
    if (ctx.input.description !== undefined) body.description = ctx.input.description;

    let s = await client.updateSection(ctx.input.sectionId, body);

    return {
      output: {
        sectionId: s.id,
        name: s.name,
        sectionType: s.sectiontype,
        category: s.category ?? null,
        description: s.description ?? null,
        url: s.url,
        appUrl: s.app_url,
        createdAt: s.created_at,
        updatedAt: s.updated_at
      },
      message: `Updated section **${s.name}** (ID: ${s.id}).`
    };
  })
  .build();

export let deleteSection = SlateTool.create(spec, {
  name: 'Delete Section',
  key: 'delete_section',
  description: `Delete a reusable content section from the Bidsketch library.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      sectionId: z.number().describe('ID of the section to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BidsketchClient(ctx.auth.token);
    await client.deleteSection(ctx.input.sectionId);

    return {
      output: { success: true },
      message: `Deleted section with ID **${ctx.input.sectionId}**.`
    };
  })
  .build();
