import { SlateTool } from 'slates';
import { z } from 'zod';
import { createGraphQLClient } from '../lib/helpers';
import { resolveType, scopeFields } from '../lib/schemas';
import { spec } from '../spec';

let queryFieldSchema = z.object({
  fieldName: z.string().describe('The GraphQL field name to use in queries.'),
  description: z.string().optional().nullable(),
  returnType: z.string().optional().describe('The return type of the query field.'),
  typeSignature: z
    .string()
    .optional()
    .describe('Native return type including list and non-null wrappers.'),
  isCollection: z.boolean().describe('Whether this field returns a collection of items.')
});

export let listContentTypes = SlateTool.create(spec, {
  name: 'List Content Types',
  key: 'list_content_types',
  description: `List all available top-level query fields from the Contentful GraphQL schema. Shows which content types can be queried and whether they are collection or single-entry queries.

This is a quick way to discover what content is available without a full schema introspection. Each content type typically has two query fields: one for fetching a single entry by ID (e.g. \`blogPost\`) and one for fetching a collection (e.g. \`blogPostCollection\`).`,
  instructions: [
    'Choose the key-authorized space ID. Optional list_spaces uses a CMA token for account discovery; verify delivery-key access separately.',
    'CursorCollection fields use pageNext/pagePrev and pages.next/pages.prev. Offset Collection fields use skip/limit.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(z.object(scopeFields))
  .output(
    z.object({
      queryFields: z
        .array(queryFieldSchema)
        .describe('Available top-level query fields in the GraphQL schema.')
    })
  )
  .handleInvocation(async ctx => {
    let fields = await createGraphQLClient(
      ctx.config,
      ctx.auth,
      ctx.input
    ).getAvailableContentTypes();
    let queryFields = fields
      .filter(field => !field.name.startsWith('_'))
      .map(field => ({
        fieldName: field.name,
        description: field.description ?? null,
        returnType: resolveType(field.type).name,
        typeSignature: resolveType(field.type).signature,
        isCollection: field.name.endsWith('Collection')
      }));
    return {
      output: { queryFields },
      message: `Found **${queryFields.length}** noninternal root query fields. Consult the schema for field arguments and native pagination.`
    };
  })
  .build();
