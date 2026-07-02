import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { kitServiceError } from '../lib/errors';
import type { Snippet } from '../lib/types';
import { spec } from '../spec';

let formatSnippet = (snippet: Snippet) => ({
  snippetId: snippet.id,
  snippetName: snippet.name,
  snippetType: snippet.snippet_type,
  archived: snippet.archived,
  key: snippet.key,
  createdAt: snippet.created_at,
  updatedAt: snippet.updated_at,
  content: snippet.content,
  document: snippet.document
    ? {
        documentId: snippet.document.id,
        value: snippet.document.value,
        valueHtml: snippet.document.value_html,
        valuePlain: snippet.document.value_plain,
        version: snippet.document.version
      }
    : undefined
});

export let manageSnippets = SlateTool.create(spec, {
  name: 'Manage Snippets',
  key: 'manage_snippets',
  description:
    'List, create, get, update, archive, or restore Kit snippets used as reusable Liquid content in broadcasts and sequence emails.',
  instructions: [
    'Use action "list" to retrieve snippets. Set includeContent when you need snippet bodies.',
    'Use action "create" with snippetName, snippetType, and either content for inline snippets or blockHtml for block snippets.',
    'Use action "get" with snippetId to retrieve one snippet including content.',
    'Use action "update" with snippetId and fields to change.',
    'Use action "archive" or "restore" with snippetId to hide or reactivate a snippet.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'get', 'update', 'archive', 'restore'])
        .describe('Action to perform'),
      snippetId: z
        .number()
        .optional()
        .describe('Snippet ID (required for get, update, archive, restore)'),
      snippetName: z.string().optional().describe('Snippet name for create or update'),
      snippetType: z
        .enum(['inline', 'block'])
        .optional()
        .describe('Snippet type. Inline snippets use content; block snippets use blockHtml.'),
      content: z
        .string()
        .optional()
        .describe('Liquid-enabled text content for inline snippets'),
      blockHtml: z.string().optional().describe('HTML content for block snippets'),
      archived: z.boolean().optional().describe('Filter list by archived state'),
      includeContent: z
        .boolean()
        .optional()
        .describe('For list, include content and document fields'),
      perPage: z.number().optional().describe('Results per page for list'),
      cursor: z.string().optional().describe('Pagination cursor for list')
    })
  )
  .output(
    z.object({
      snippets: z
        .array(
          z.object({
            snippetId: z.number(),
            snippetName: z.string(),
            snippetType: z.string(),
            archived: z.boolean(),
            key: z.string(),
            createdAt: z.string(),
            updatedAt: z.string(),
            content: z.string().nullable().optional(),
            document: z
              .object({
                documentId: z.number(),
                value: z.string().nullable(),
                valueHtml: z.string().nullable(),
                valuePlain: z.string().nullable(),
                version: z.number()
              })
              .optional()
          })
        )
        .optional()
        .describe('Snippet records for list action'),
      snippet: z
        .object({
          snippetId: z.number(),
          snippetName: z.string(),
          snippetType: z.string(),
          archived: z.boolean(),
          key: z.string(),
          createdAt: z.string(),
          updatedAt: z.string(),
          content: z.string().nullable().optional(),
          document: z
            .object({
              documentId: z.number(),
              value: z.string().nullable(),
              valueHtml: z.string().nullable(),
              valuePlain: z.string().nullable(),
              version: z.number()
            })
            .optional()
        })
        .optional()
        .describe('Snippet record for create, get, update, archive, or restore'),
      hasNextPage: z.boolean().optional(),
      nextCursor: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let input = ctx.input;

    if (input.action === 'list') {
      let result = await client.listSnippets({
        snippetType: input.snippetType,
        archived: input.archived,
        includeContent: input.includeContent,
        perPage: input.perPage,
        after: input.cursor
      });
      let snippets = result.snippets.map(formatSnippet);
      return {
        output: {
          snippets,
          hasNextPage: result.pagination.has_next_page,
          nextCursor: result.pagination.end_cursor
        },
        message: `Found **${snippets.length}** snippet(s)${result.pagination.has_next_page ? ' (more available)' : ''}.`
      };
    }

    if (input.action === 'create') {
      if (!input.snippetName) throw kitServiceError('snippetName is required for create');
      if (!input.snippetType) throw kitServiceError('snippetType is required for create');
      if (input.snippetType === 'inline' && !input.content) {
        throw kitServiceError('content is required when creating an inline snippet');
      }
      if (input.snippetType === 'block' && !input.blockHtml) {
        throw kitServiceError('blockHtml is required when creating a block snippet');
      }
      let snippet = await client.createSnippet({
        name: input.snippetName,
        snippetType: input.snippetType,
        content: input.content,
        blockHtml: input.blockHtml
      });
      return {
        output: {
          snippet: formatSnippet(snippet)
        },
        message: `Created snippet **${snippet.name}** (#${snippet.id})`
      };
    }

    if (!input.snippetId) {
      throw kitServiceError(`snippetId is required for ${input.action}`);
    }

    if (input.action === 'get') {
      let snippet = await client.getSnippet(input.snippetId);
      return {
        output: {
          snippet: formatSnippet(snippet)
        },
        message: `Snippet **${snippet.name}** (#${snippet.id})`
      };
    }

    let snippet = await client.updateSnippet(input.snippetId, {
      name: input.snippetName,
      snippetType: input.snippetType,
      archived:
        input.action === 'archive' ? true : input.action === 'restore' ? false : undefined,
      content: input.content,
      blockHtml: input.blockHtml
    });

    return {
      output: {
        snippet: formatSnippet(snippet)
      },
      message: `Updated snippet **${snippet.name}** (#${snippet.id})`
    };
  });
