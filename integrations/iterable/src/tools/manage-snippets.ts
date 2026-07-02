import { SlateTool } from 'slates';
import { z } from 'zod';
import { IterableClient } from '../lib/client';
import { requireField } from '../lib/validation';
import { spec } from '../spec';

export let manageSnippets = SlateTool.create(spec, {
  name: 'Manage Snippets',
  key: 'manage_snippets',
  description: `Create, update, list, or delete snippets in Iterable. Snippets are reusable content blocks that can be embedded in templates using Handlebars syntax.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      name: z
        .string()
        .optional()
        .describe('Snippet name or ID (required for get, create, update, delete)'),
      content: z
        .string()
        .optional()
        .describe('Snippet content/HTML (required for create and update)')
    })
  )
  .output(
    z.object({
      snippets: z
        .array(
          z.object({
            name: z.string().describe('Snippet name'),
            content: z.string().optional().describe('Snippet content'),
            createdAt: z.string().optional().describe('When the snippet was created'),
            updatedAt: z.string().optional().describe('When the snippet was last updated')
          })
        )
        .optional()
        .describe('List of snippets'),
      snippet: z.record(z.string(), z.any()).optional().describe('Snippet details'),
      message: z.string().describe('Result message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IterableClient({
      token: ctx.auth.token,
      dataCenter: ctx.config.dataCenter
    });

    if (ctx.input.action === 'list') {
      let result = await client.getSnippets();
      let snippets = (result.snippets || []).map((s: any) => ({
        name: s.name,
        content: s.content,
        createdAt: s.createdAt ? String(s.createdAt) : undefined,
        updatedAt: s.updatedAt ? String(s.updatedAt) : undefined
      }));
      return {
        output: {
          snippets,
          message: `Found ${snippets.length} snippet(s).`
        },
        message: `Retrieved **${snippets.length}** snippet(s).`
      };
    }

    if (ctx.input.action === 'get') {
      let name = requireField(ctx.input.name, 'name');
      let snippet = await client.getSnippet(name);
      return {
        output: {
          snippet,
          message: `Retrieved snippet "${name}".`
        },
        message: `Retrieved snippet **${name}**.`
      };
    }

    if (ctx.input.action === 'create') {
      let name = requireField(ctx.input.name, 'name');
      let content = requireField(ctx.input.content, 'content');
      await client.createSnippet({
        name,
        content
      });
      return {
        output: {
          message: `Snippet "${name}" created.`
        },
        message: `Created snippet **${name}**.`
      };
    }

    if (ctx.input.action === 'update') {
      let name = requireField(ctx.input.name, 'name');
      let content = requireField(ctx.input.content, 'content');
      await client.updateSnippet({
        name,
        content
      });
      return {
        output: {
          message: `Snippet "${name}" updated.`
        },
        message: `Updated snippet **${name}**.`
      };
    }

    // delete
    let name = requireField(ctx.input.name, 'name');
    await client.deleteSnippet(name);
    return {
      output: {
        message: `Snippet "${name}" deleted.`
      },
      message: `Deleted snippet **${name}**.`
    };
  })
  .build();
