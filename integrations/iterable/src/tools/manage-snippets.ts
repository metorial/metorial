import { SlateTool } from 'slates';
import { z } from 'zod';
import { IterableClient } from '../lib/client';
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
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Operation to perform'),
      name: z
        .string()
        .optional()
        .describe('Snippet name (required for create, update, delete)'),
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

    if (ctx.input.action === 'create') {
      await client.createSnippet({
        name: ctx.input.name!,
        content: ctx.input.content!
      });
      return {
        output: {
          message: `Snippet "${ctx.input.name}" created.`
        },
        message: `Created snippet **${ctx.input.name}**.`
      };
    }

    if (ctx.input.action === 'update') {
      await client.updateSnippet({
        name: ctx.input.name!,
        content: ctx.input.content!
      });
      return {
        output: {
          message: `Snippet "${ctx.input.name}" updated.`
        },
        message: `Updated snippet **${ctx.input.name}**.`
      };
    }

    // delete
    await client.deleteSnippet(ctx.input.name!);
    return {
      output: {
        message: `Snippet "${ctx.input.name}" deleted.`
      },
      message: `Deleted snippet **${ctx.input.name}**.`
    };
  })
  .build();
