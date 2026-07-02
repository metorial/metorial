import { SlateTool } from 'slates';
import { z } from 'zod';
import { FingertipClient } from '../lib/client';
import { spec } from '../spec';

let blockOutputSchema = z.object({
  blockId: z.string(),
  pageId: z.string(),
  name: z.string(),
  content: z.any().nullable(),
  kind: z.string().nullable(),
  isComponent: z.boolean(),
  componentBlockId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export let listBlocks = SlateTool.create(spec, {
  name: 'List Blocks',
  key: 'list_blocks',
  description: `List all content blocks within a page. Blocks are the modular content elements (text, images, forms, etc.) that compose a page.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      pageId: z.string().describe('ID of the page to list blocks for')
    })
  )
  .output(
    z.object({
      blocks: z.array(blockOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new FingertipClient(ctx.auth.token);
    let blocks = await client.listBlocks(ctx.input.pageId);

    let mapped = blocks.map(b => ({
      blockId: b.id,
      pageId: b.pageId,
      name: b.name,
      content: b.content,
      kind: b.kind,
      isComponent: b.isComponent,
      componentBlockId: b.componentBlockId,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt
    }));

    return {
      output: { blocks: mapped },
      message: `Found **${mapped.length}** block(s) on the page.`
    };
  })
  .build();

export let createBlock = SlateTool.create(spec, {
  name: 'Create Block',
  key: 'create_block',
  description: `Create a new content block within a page. Blocks are the building elements of a page such as text, images, or forms.`
})
  .input(
    z.object({
      pageId: z.string().describe('ID of the page to add the block to'),
      name: z.string().describe('Name of the block'),
      kind: z.string().nullable().describe('Type/kind of block (e.g., text, image, form)'),
      content: z.any().optional().describe('Block content configuration'),
      isComponent: z
        .boolean()
        .optional()
        .describe('Whether this block is a reusable component'),
      componentBlockId: z
        .string()
        .nullable()
        .optional()
        .describe('ID of the parent component block if this is an instance')
    })
  )
  .output(blockOutputSchema)
  .handleInvocation(async ctx => {
    let client = new FingertipClient(ctx.auth.token);
    let block = await client.createBlock(ctx.input.pageId, {
      name: ctx.input.name,
      kind: ctx.input.kind,
      content: ctx.input.content,
      isComponent: ctx.input.isComponent,
      componentBlockId: ctx.input.componentBlockId
    });

    return {
      output: {
        blockId: block.id,
        pageId: block.pageId,
        name: block.name,
        content: block.content,
        kind: block.kind,
        isComponent: block.isComponent,
        componentBlockId: block.componentBlockId,
        createdAt: block.createdAt,
        updatedAt: block.updatedAt
      },
      message: `Created block **${block.name}** (kind: ${block.kind}).`
    };
  })
  .build();

export let updateBlock = SlateTool.create(spec, {
  name: 'Update Block',
  key: 'update_block',
  description: `Update an existing content block's properties or content. Only provided fields will be updated.`
})
  .input(
    z.object({
      blockId: z.string().describe('ID of the block to update'),
      name: z.string().optional().describe('New name for the block'),
      content: z.any().optional().describe('New content configuration'),
      kind: z.string().nullable().optional().describe('New block kind/type')
    })
  )
  .output(blockOutputSchema)
  .handleInvocation(async ctx => {
    let client = new FingertipClient(ctx.auth.token);
    let { blockId, ...updateData } = ctx.input;
    let block = await client.updateBlock(blockId, updateData);

    return {
      output: {
        blockId: block.id,
        pageId: block.pageId,
        name: block.name,
        content: block.content,
        kind: block.kind,
        isComponent: block.isComponent,
        componentBlockId: block.componentBlockId,
        createdAt: block.createdAt,
        updatedAt: block.updatedAt
      },
      message: `Updated block **${block.name}**.`
    };
  })
  .build();

export let deleteBlock = SlateTool.create(spec, {
  name: 'Delete Block',
  key: 'delete_block',
  description: `Permanently delete a content block from a page.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      blockId: z.string().describe('ID of the block to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FingertipClient(ctx.auth.token);
    let result = await client.deleteBlock(ctx.input.blockId);

    return {
      output: { success: result.success },
      message: `Block deleted successfully.`
    };
  })
  .build();
