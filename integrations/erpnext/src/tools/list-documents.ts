import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDocuments = SlateTool.create(spec, {
  name: 'List Documents',
  key: 'list_documents',
  description: `List and search ERPNext documents of any DocType with filtering, field selection, sorting, and pagination. Supports AND/OR filters using ERPNext filter syntax.`,
  instructions: [
    'Filters can be a JSON object like {"status": "Open"} for equality checks, or an array of [field, operator, value] tuples for advanced filtering (e.g., [["grand_total", ">", 1000]]).',
    'Common operators: =, !=, >, <, >=, <=, like, not like, in, not in, between.',
    'Use orFilters for OR conditions across filter groups.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      doctype: z
        .string()
        .describe('The DocType to list (e.g., "Customer", "Sales Order", "Item")'),
      fields: z
        .array(z.string())
        .optional()
        .describe(
          'Fields to return (e.g., ["name", "customer_name", "status"]). Defaults to ["name"].'
        ),
      filters: z
        .any()
        .optional()
        .describe('AND filters as a JSON object or array of [field, operator, value] tuples'),
      orFilters: z
        .any()
        .optional()
        .describe('OR filters as a JSON object or array of [field, operator, value] tuples'),
      orderBy: z
        .string()
        .optional()
        .describe('Sort order (e.g., "creation desc", "modified asc")'),
      pageSize: z.number().optional().describe('Number of results to return (default 20)'),
      offset: z.number().optional().describe('Number of results to skip for pagination')
    })
  )
  .output(
    z.object({
      documents: z.array(z.record(z.string(), z.any())).describe('List of matching documents'),
      count: z.number().describe('Number of documents returned in this page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      siteUrl: ctx.config.siteUrl,
      token: ctx.auth.token
    });

    let documents = await client.listDocuments({
      doctype: ctx.input.doctype,
      fields: ctx.input.fields,
      filters: ctx.input.filters,
      orFilters: ctx.input.orFilters,
      orderBy: ctx.input.orderBy,
      limitPageLength: ctx.input.pageSize,
      limitStart: ctx.input.offset
    });

    return {
      output: {
        documents,
        count: documents.length
      },
      message: `Found **${documents.length}** ${ctx.input.doctype} document(s)`
    };
  })
  .build();
