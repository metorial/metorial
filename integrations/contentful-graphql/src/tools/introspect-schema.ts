import { SlateTool } from 'slates';
import { z } from 'zod';
import { createGraphQLClient } from '../lib/helpers';
import { spec } from '../spec';

let typeFieldSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  typeName: z.string().optional(),
  typeKind: z.string().optional(),
  args: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional().nullable(),
        typeName: z.string().optional()
      })
    )
    .optional()
});

let contentTypeSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  kind: z.string().optional(),
  fields: z.array(typeFieldSchema).optional()
});

export let introspectSchema = SlateTool.create(spec, {
  name: 'Introspect Schema',
  key: 'introspect_schema',
  description: `Discover the GraphQL schema for your Contentful space. Returns available content types, their fields, field types, and query arguments.

Use this to understand what queries are available before using the **Query Content** or **Preview Content** tools. The schema is auto-generated from your Contentful content model and updates whenever content types change.`,
  instructions: [
    'Run this first to discover available content types and their fields.',
    'Collection queries follow the naming pattern: `contentTypeCollection` (e.g. `blogPostCollection`).',
    'Single-entry queries use the content type name directly (e.g. `blogPost(id: "...")`). ',
    'Set `includeSystemTypes` to false to filter out internal GraphQL types and focus only on your content model.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeSystemTypes: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'Whether to include internal GraphQL system types (types starting with "__"). Defaults to false.'
        )
    })
  )
  .output(
    z.object({
      queryTypeName: z.string().optional().describe('Name of the root query type.'),
      contentTypes: z
        .array(contentTypeSchema)
        .describe('Available content types and their fields.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createGraphQLClient(ctx.config, ctx.auth);

    let result = await client.introspect();

    if (result.errors && result.errors.length > 0) {
      throw new Error(
        `Schema introspection failed: ${result.errors.map((e: any) => e.message).join(', ')}`
      );
    }

    let schema = result.data?.__schema;
    let queryTypeName = schema?.queryType?.name;

    let resolveTypeName = (type: any): string => {
      if (!type) return 'unknown';
      if (type.name) return type.name;
      if (type.ofType) return resolveTypeName(type.ofType);
      return type.kind || 'unknown';
    };

    let types = (schema?.types || [])
      .filter((t: any) => {
        if (!ctx.input.includeSystemTypes && t.name?.startsWith('__')) return false;
        return t.kind === 'OBJECT' || t.kind === 'INTERFACE';
      })
      .map((t: any) => ({
        name: t.name,
        description: t.description || null,
        kind: t.kind,
        fields: (t.fields || []).map((f: any) => ({
          name: f.name,
          description: f.description || null,
          typeName: resolveTypeName(f.type),
          typeKind: f.type?.kind,
          args: (f.args || []).map((a: any) => ({
            name: a.name,
            description: a.description || null,
            typeName: resolveTypeName(a.type)
          }))
        }))
      }));

    return {
      output: {
        queryTypeName,
        contentTypes: types
      },
      message: `Introspection complete. Found **${types.length}** types in the schema.`
    };
  })
  .build();
