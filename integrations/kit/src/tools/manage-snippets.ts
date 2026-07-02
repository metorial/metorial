import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { kitServiceError } from '../lib/errors';
import { spec } from '../spec';

let snippetSchema = z.object({
  snippetId: z.number().describe('Snippet ID'),
  name: z.string().describe('Snippet name'),
  snippetType: z.string().describe('Snippet type'),
  archived: z.boolean().describe('Whether the snippet is archived'),
  key: z.string().describe('Liquid key used as {{ snippet.key }}'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Update timestamp'),
  content: z.string().nullable().optional().describe('Inline snippet content'),
  documentHtml: z.string().nullable().optional().describe('Block snippet HTML content')
});

export let manageSnippets = SlateTool.create(spec, {
  name: 'Manage Snippets',
  key: 'manage_snippets',
  description: `Create, get, update, archive, restore, and list reusable Kit snippets for Liquid-powered broadcast and sequence email content.`,
  instructions: [
    'Use snippetType=inline with content for plain Liquid text snippets.',
    'Use snippetType=block with documentHtml for rich HTML block snippets.',
    'Kit does not expose hard delete for snippets; update archived=true to archive.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'archive', 'restore'])
        .describe('The operation to perform'),
      snippetId: z
        .number()
        .optional()
        .describe('Snippet ID (required for get, update, archive, restore)'),
      name: z.string().optional().describe('Snippet name (required for create)'),
      snippetType: z
        .enum(['inline', 'block'])
        .optional()
        .describe('Snippet type for create/update'),
      content: z.string().optional().describe('Inline Liquid-enabled text content'),
      documentHtml: z.string().optional().describe('Block HTML content'),
      archived: z.boolean().optional().describe('Filter list results by archive state'),
      includeContent: z.boolean().optional().describe('Include content when listing snippets'),
      perPage: z.number().optional().describe('Number of results per page (max 1000)'),
      afterCursor: z.string().optional().describe('Pagination cursor to fetch next page'),
      beforeCursor: z.string().optional().describe('Pagination cursor to fetch previous page')
    })
  )
  .output(
    z.object({
      snippets: z.array(snippetSchema).optional().describe('List of snippets'),
      snippet: snippetSchema.optional().describe('Single snippet'),
      hasNextPage: z.boolean().optional().describe('Whether more results are available'),
      endCursor: z.string().nullable().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let mapSnippet = (snippet: any) => ({
      snippetId: snippet.id,
      name: snippet.name,
      snippetType: snippet.snippet_type,
      archived: snippet.archived,
      key: snippet.key,
      createdAt: snippet.created_at,
      updatedAt: snippet.updated_at,
      content: snippet.content,
      documentHtml: snippet.document?.value_html
    });

    let requireSnippetId = (action: string) => {
      if (!ctx.input.snippetId) {
        throw kitServiceError(`Snippet ID is required for ${action}`);
      }

      return ctx.input.snippetId;
    };

    let validateSnippetBody = () => {
      if (ctx.input.snippetType === 'inline' && !ctx.input.content) {
        throw kitServiceError('content is required when snippetType is inline');
      }

      if (ctx.input.snippetType === 'block' && !ctx.input.documentHtml) {
        throw kitServiceError('documentHtml is required when snippetType is block');
      }
    };

    if (ctx.input.action === 'list') {
      let result = await client.listSnippets({
        snippetType: ctx.input.snippetType,
        archived: ctx.input.archived,
        includeContent: ctx.input.includeContent,
        perPage: ctx.input.perPage,
        after: ctx.input.afterCursor,
        before: ctx.input.beforeCursor
      });
      let snippets = result.data.map(mapSnippet);
      return {
        output: {
          snippets,
          hasNextPage: result.pagination.has_next_page,
          endCursor: result.pagination.end_cursor
        },
        message: `Found **${snippets.length}** snippets.`
      };
    }

    if (ctx.input.action === 'get') {
      let data = await client.getSnippet(requireSnippetId('get'));
      return {
        output: { snippet: mapSnippet(data.snippet) },
        message: `Retrieved snippet **${data.snippet.name}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) {
        throw kitServiceError('Snippet name is required for create');
      }
      if (!ctx.input.snippetType) {
        throw kitServiceError('snippetType is required for create');
      }
      validateSnippetBody();

      let data = await client.createSnippet({
        name: ctx.input.name,
        snippetType: ctx.input.snippetType,
        content: ctx.input.content,
        documentHtml: ctx.input.documentHtml
      });
      return {
        output: { snippet: mapSnippet(data.snippet) },
        message: `Created snippet **${data.snippet.name}**.`
      };
    }

    if (ctx.input.action === 'update') {
      let snippetId = requireSnippetId('update');
      if (ctx.input.snippetType) {
        validateSnippetBody();
      }

      let data = await client.updateSnippet(snippetId, {
        name: ctx.input.name,
        snippetType: ctx.input.snippetType,
        content: ctx.input.content,
        documentHtml: ctx.input.documentHtml
      });
      return {
        output: { snippet: mapSnippet(data.snippet) },
        message: `Updated snippet **${data.snippet.name}**.`
      };
    }

    if (ctx.input.action === 'archive' || ctx.input.action === 'restore') {
      let snippetId = requireSnippetId(ctx.input.action);
      let data = await client.updateSnippet(snippetId, {
        archived: ctx.input.action === 'archive'
      });
      return {
        output: { snippet: mapSnippet(data.snippet) },
        message: `${ctx.input.action === 'archive' ? 'Archived' : 'Restored'} snippet **${data.snippet.name}**.`
      };
    }

    throw kitServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
