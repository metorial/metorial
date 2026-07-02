import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { snippetSchema } from '../lib/types';
import { spec } from '../spec';

export let manageSnippets = SlateTool.create(spec, {
  name: 'Manage Snippets',
  key: 'manage_snippets',
  description: `List, create, update, or delete response template snippets. Snippets are saved replies for frequently asked questions that agents can reuse across tickets.`,
  instructions: [
    'Set action to "list" to retrieve all snippets.',
    'Set action to "create" to create a new snippet (name required).',
    'Set action to "update" to modify an existing snippet (snippetId required).',
    'Set action to "delete" to remove a snippet (snippetId required).'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'update', 'delete'])
        .describe('The operation to perform'),
      snippetId: z.number().optional().describe('Snippet ID (required for update and delete)'),
      name: z.string().optional().describe('Snippet name/title (required for create)'),
      tags: z.string().optional().describe('Comma-separated tags for the snippet'),
      contentText: z.string().optional().describe('Plain text content of the snippet'),
      contentHtml: z.string().optional().describe('HTML content of the snippet')
    })
  )
  .output(
    z.object({
      snippets: z
        .array(snippetSchema)
        .optional()
        .describe('List of snippets (for list action)'),
      snippet: snippetSchema.optional().describe('Created or updated snippet'),
      deleted: z.boolean().optional().describe('Whether the snippet was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companySubdomain: ctx.config.companySubdomain
    });

    let { action } = ctx.input;

    if (action === 'list') {
      let snippets = await client.listSnippets();
      return {
        output: { snippets },
        message: `Retrieved **${snippets.length}** snippets`
      };
    }

    if (action === 'create') {
      let snippet = await client.createSnippet({
        name: ctx.input.name!,
        tags: ctx.input.tags,
        contentText: ctx.input.contentText,
        contentHtml: ctx.input.contentHtml
      });
      return {
        output: { snippet },
        message: `Created snippet **"${snippet.name}"** (ID: ${snippet.snippetId})`
      };
    }

    if (action === 'update') {
      let snippet = await client.updateSnippet(ctx.input.snippetId!, {
        name: ctx.input.name,
        tags: ctx.input.tags,
        contentText: ctx.input.contentText,
        contentHtml: ctx.input.contentHtml
      });
      return {
        output: { snippet },
        message: `Updated snippet **"${snippet.name}"** (ID: ${snippet.snippetId})`
      };
    }

    // delete
    await client.deleteSnippet(ctx.input.snippetId!);
    return {
      output: { deleted: true },
      message: `Deleted snippet **#${ctx.input.snippetId}**`
    };
  })
  .build();
