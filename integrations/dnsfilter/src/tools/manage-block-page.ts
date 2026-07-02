import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageBlockPage = SlateTool.create(spec, {
  name: 'Manage Block Page',
  key: 'manage_block_page',
  description: `List, create, update, or delete custom block pages. Block pages are displayed to end users when they attempt to access a blocked domain. They can be associated with specific policies, sites, or collections.
- **list**: Get all block pages.
- **get**: Retrieve a specific block page.
- **create**: Create a new custom block page.
- **update**: Modify an existing block page.
- **delete**: Remove a block page.`
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      blockPageId: z
        .string()
        .optional()
        .describe('Block page ID (required for get/update/delete)'),
      name: z.string().optional().describe('Block page name (for create/update)'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Block page configuration attributes')
    })
  )
  .output(
    z.object({
      blockPages: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of block pages (for list)'),
      blockPage: z
        .record(z.string(), z.any())
        .optional()
        .describe('Block page details (for get/create/update)'),
      deleted: z.boolean().optional().describe('Whether the block page was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { action, blockPageId } = ctx.input;

    if (action === 'list') {
      let blockPages = await client.listBlockPages();
      return {
        output: { blockPages },
        message: `Found **${blockPages.length}** block page(s).`
      };
    }

    if (action === 'get') {
      if (!blockPageId) throw new Error('blockPageId is required for get');
      let blockPage = await client.getBlockPage(blockPageId);
      return {
        output: { blockPage },
        message: `Retrieved block page **${blockPage.name ?? blockPageId}**.`
      };
    }

    if (action === 'delete') {
      if (!blockPageId) throw new Error('blockPageId is required for delete');
      await client.deleteBlockPage(blockPageId);
      return {
        output: { deleted: true },
        message: `Deleted block page **${blockPageId}**.`
      };
    }

    let params: Record<string, any> = {};
    if (ctx.input.name) params.name = ctx.input.name;
    if (ctx.input.attributes) Object.assign(params, ctx.input.attributes);

    if (action === 'create') {
      let blockPage = await client.createBlockPage(params);
      return {
        output: { blockPage },
        message: `Created block page **${blockPage.name ?? 'new block page'}**.`
      };
    }

    if (!blockPageId) throw new Error('blockPageId is required for update');
    let blockPage = await client.updateBlockPage(blockPageId, params);
    return {
      output: { blockPage },
      message: `Updated block page **${blockPage.name ?? blockPageId}**.`
    };
  })
  .build();
