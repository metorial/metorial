import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let sectionSchema = z.object({
  sectionId: z.string(),
  currency: z.string(),
  accountId: z.number(),
  proposalId: z.number().nullable(),
  templateId: z.number().nullable(),
  title: z.string(),
  name: z.string().nullable(),
  body: z.string().nullable(),
  position: z.number(),
  reusable: z.boolean(),
  sectionType: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  pageBreak: z.boolean(),
  optional: z.boolean(),
  selected: z.boolean(),
  includeTotal: z.boolean(),
  totalInCents: z.number(),
  totalFormatted: z.string(),
  lineItemIds: z.array(z.string())
});

export let listSections = SlateTool.create(spec, {
  name: 'List Sections',
  key: 'list_sections',
  description: `Retrieve sections for a specific proposal or template. Sections are the building blocks of proposals and can be either text content or cost sections with line items.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      proposalId: z.number().optional().describe('Filter by proposal ID'),
      templateId: z.number().optional().describe('Filter by template ID'),
      includeLineItems: z
        .boolean()
        .optional()
        .describe('Include line item data in the response'),
      page: z.number().optional().describe('Page number (defaults to 1)'),
      perPage: z.number().optional().describe('Number of sections per page (defaults to 25)')
    })
  )
  .output(
    z.object({
      sections: z.array(sectionSchema),
      currentPage: z.number(),
      totalPages: z.number(),
      totalCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listSections(ctx.input);

    return {
      output: {
        sections: result.items,
        currentPage: result.pagination.currentPage,
        totalPages: result.pagination.totalPages,
        totalCount: result.pagination.totalCount
      },
      message: `Found **${result.pagination.totalCount}** sections (page ${result.pagination.currentPage} of ${result.pagination.totalPages}).`
    };
  })
  .build();

export let getSection = SlateTool.create(spec, {
  name: 'Get Section',
  key: 'get_section',
  description: `Retrieve detailed information about a specific section including its content, type, pricing totals, and associated line items.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sectionId: z.string().describe('The ID of the section to retrieve')
    })
  )
  .output(sectionSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getSection(ctx.input.sectionId);

    return {
      output: result,
      message: `Retrieved section **"${result.title}"** (type: ${result.sectionType}, ID: ${result.sectionId}).`
    };
  })
  .build();

export let createSection = SlateTool.create(spec, {
  name: 'Create Section',
  key: 'create_section',
  description: `Add a new section to a proposal or template. Sections can be "text" (content only) or "cost" (with line items and pricing). Set optional to true to make it a client-selectable package.`,
  instructions: [
    'Provide either proposalId or templateId to specify where the section belongs.',
    'Use sectionType "text" for content-only sections and "cost" for sections with pricing.'
  ]
})
  .input(
    z.object({
      proposalId: z.number().optional().describe('Proposal ID to add the section to'),
      templateId: z.number().optional().describe('Template ID to add the section to'),
      title: z.string().describe('Section title'),
      body: z.string().optional().describe('Section body content (HTML supported)'),
      name: z.string().optional().describe('Internal name for the section'),
      position: z.number().optional().describe('Position/order of the section (0-based)'),
      reusable: z.boolean().optional().describe('Make this section reusable across proposals'),
      sectionType: z
        .enum(['text', 'cost'])
        .optional()
        .describe('Section type: "text" for content or "cost" for pricing'),
      pageBreak: z
        .boolean()
        .optional()
        .describe('Insert a page break before this section in PDF'),
      optional: z
        .boolean()
        .optional()
        .describe('Make this section optional (client-selectable package)'),
      includeTotal: z.boolean().optional().describe('Show subtotal for this cost section')
    })
  )
  .output(sectionSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createSection(ctx.input);

    return {
      output: result,
      message: `Created section **"${result.title}"** (type: ${result.sectionType}, ID: ${result.sectionId}).`
    };
  })
  .build();

export let updateSection = SlateTool.create(spec, {
  name: 'Update Section',
  key: 'update_section',
  description: `Update a section's title, body, position, or settings. Only provided fields will be updated.`
})
  .input(
    z.object({
      sectionId: z.string().describe('The ID of the section to update'),
      title: z.string().optional().describe('Updated title'),
      body: z.string().optional().describe('Updated body content (HTML supported)'),
      name: z.string().optional().describe('Updated internal name'),
      position: z.number().optional().describe('Updated position/order'),
      reusable: z.boolean().optional().describe('Update reusability'),
      pageBreak: z.boolean().optional().describe('Update page break setting'),
      optional: z.boolean().optional().describe('Update optional/package setting'),
      includeTotal: z.boolean().optional().describe('Update subtotal visibility')
    })
  )
  .output(sectionSchema)
  .handleInvocation(async ctx => {
    let { sectionId, ...updateData } = ctx.input;
    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateSection(sectionId, updateData);

    return {
      output: result,
      message: `Updated section **"${result.title}"** (ID: ${result.sectionId}).`
    };
  })
  .build();

export let deleteSection = SlateTool.create(spec, {
  name: 'Delete Section',
  key: 'delete_section',
  description: `Permanently delete a section from a proposal or template. This also removes any line items within the section.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      sectionId: z.string().describe('The ID of the section to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteSection(ctx.input.sectionId);

    return {
      output: { success: true },
      message: `Deleted section with ID **${ctx.input.sectionId}**.`
    };
  })
  .build();
