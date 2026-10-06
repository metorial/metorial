import { SlateTool } from 'slates';
import { z } from 'zod';
import { createGraphQLClient } from '../lib/helpers';
import { resolveType, scopeFields } from '../lib/schemas';
import { spec } from '../spec';

let typeFieldSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  typeName: z.string().optional(),
  typeKind: z.string().optional(),
  typeSignature: z
    .string()
    .optional()
    .describe('Native type notation, including list brackets and non-null markers.'),
  args: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional().nullable(),
        typeName: z.string().optional(),
        typeSignature: z.string().optional()
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
    'Discover offset Collection and native CursorCollection fields and their arguments from the root query type.',
    'Choose the key-authorized space. Optional list_spaces discovery uses a separate CMA token and does not establish delivery-key access.',
    'Single-entry queries use the content type name directly (e.g. `blogPost(id: "...")`). ',
    'Set `includeSystemTypes` to false to filter out internal GraphQL types and focus only on your content model.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ...scopeFields,
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
    let schema = await createGraphQLClient(ctx.config, ctx.auth, ctx.input).introspect();
    let types = schema.types
      .filter(
        type =>
          (ctx.input.includeSystemTypes || !type.name.startsWith('__')) &&
          (type.kind === 'OBJECT' || type.kind === 'INTERFACE')
      )
      .map(type => ({
        name: type.name,
        description: type.description ?? null,
        kind: type.kind,
        fields: (type.fields ?? []).map(field => ({
          name: field.name,
          description: field.description ?? null,
          typeName: resolveType(field.type).name,
          typeKind: field.type.kind,
          typeSignature: resolveType(field.type).signature,
          args: field.args.map(arg => ({
            name: arg.name,
            description: arg.description ?? null,
            typeName: resolveType(arg.type).name,
            typeSignature: resolveType(arg.type).signature
          }))
        }))
      }));
    return {
      output: { queryTypeName: schema.queryType.name, contentTypes: types },
      message: `Introspection complete. Found **${types.length}** object and interface types.`
    };
  })
  .build();
