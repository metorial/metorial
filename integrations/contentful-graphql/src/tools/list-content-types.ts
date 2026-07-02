import { SlateTool } from 'slates';
import { z } from 'zod';
import { createGraphQLClient } from '../lib/helpers';
import { spec } from '../spec';

let queryFieldSchema = z.object({
  fieldName: z.string().describe('The GraphQL field name to use in queries.'),
  description: z.string().optional().nullable(),
  returnType: z.string().optional().describe('The return type of the query field.'),
  isCollection: z.boolean().describe('Whether this field returns a collection of items.')
});

export let listContentTypes = SlateTool.create(spec, {
  name: 'List Content Types',
  key: 'list_content_types',
  description: `List all available top-level query fields from the Contentful GraphQL schema. Shows which content types can be queried and whether they are collection or single-entry queries.

This is a quick way to discover what content is available without a full schema introspection. Each content type typically has two query fields: one for fetching a single entry by ID (e.g. \`blogPost\`) and one for fetching a collection (e.g. \`blogPostCollection\`).`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      queryFields: z
        .array(queryFieldSchema)
        .describe('Available top-level query fields in the GraphQL schema.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createGraphQLClient(ctx.config, ctx.auth);

    let result = await client.getAvailableContentTypes();

    if (result.errors && result.errors.length > 0) {
      throw new Error(
        `Failed to list content types: ${result.errors.map((e: any) => e.message).join(', ')}`
      );
    }

    let fields = result.data?.__schema?.queryType?.fields || [];

    let resolveTypeName = (type: any): string => {
      if (!type) return 'unknown';
      if (type.name) return type.name;
      if (type.ofType) return resolveTypeName(type.ofType);
      return type.kind || 'unknown';
    };

    let queryFields = fields
      .filter((f: any) => !f.name.startsWith('_'))
      .map((f: any) => ({
        fieldName: f.name,
        description: f.description || null,
        returnType: resolveTypeName(f.type),
        isCollection: f.name.endsWith('Collection')
      }));

    let collectionCount = queryFields.filter((f: any) => f.isCollection).length;
    let singleCount = queryFields.filter((f: any) => !f.isCollection).length;

    return {
      output: {
        queryFields
      },
      message: `Found **${queryFields.length}** query fields: ${collectionCount} collection queries and ${singleCount} single-entry queries.`
    };
  })
  .build();
