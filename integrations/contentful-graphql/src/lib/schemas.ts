import { createApiServiceError } from 'slates';
import { z } from 'zod';

export let scopeFields = {
  spaceId: z
    .string()
    .optional()
    .describe(
      'Space ID authorized by the delivery or preview key. Call list_spaces with an optional CMA token for account discovery, then verify the chosen space in API-key settings. A stored legacy space ID is used when omitted.'
    ),
  environmentId: z
    .string()
    .optional()
    .describe(
      'Environment ID or alias authorized by the key. Defaults to the connection environment, usually master.'
    )
};
export let queryFields = {
  ...scopeFields,
  query: z
    .string()
    .describe(
      'Native read-only GraphQL query. The complete JSON request, including variables, must fit within 8 KiB.'
    ),
  variables: z
    .record(z.string(), z.any())
    .optional()
    .describe(
      'Native JSON variables. Preserve cursor strings exactly; omit variables only when they are not needed.'
    ),
  operationName: z
    .string()
    .optional()
    .describe(
      'Name of the query operation to execute. Required when the document contains multiple operations.'
    )
};
export let graphQLErrorSchema = z
  .object({
    message: z.string(),
    locations: z
      .array(
        z.object({ line: z.number().int().positive(), column: z.number().int().positive() })
      )
      .optional(),
    path: z.array(z.union([z.string(), z.number().int()])).optional(),
    extensions: z.record(z.string(), z.unknown()).optional()
  })
  .passthrough();
export let graphQLResponseSchema = z
  .object({
    data: z.record(z.string(), z.unknown()).nullable().optional(),
    errors: z.array(graphQLErrorSchema).min(1).optional(),
    extensions: z.record(z.string(), z.unknown()).optional()
  })
  .refine(
    value => (value.data !== undefined && value.data !== null) || value.errors !== undefined
  );

export interface TypeReference {
  kind: string;
  name?: string | null;
  ofType?: TypeReference | null;
}
let typeReferenceSchema: z.ZodType<TypeReference> = z.lazy(() =>
  z.object({
    kind: z.enum([
      'SCALAR',
      'OBJECT',
      'INTERFACE',
      'UNION',
      'ENUM',
      'INPUT_OBJECT',
      'LIST',
      'NON_NULL'
    ]),
    name: z.string().min(1).nullable().optional(),
    ofType: typeReferenceSchema.nullable().optional()
  })
);
export let introspectionFieldSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  type: typeReferenceSchema,
  args: z.array(
    z.object({
      name: z.string().min(1),
      description: z.string().nullable().optional(),
      type: typeReferenceSchema
    })
  )
});
export let introspectionSchema = z.object({
  __schema: z.object({
    queryType: z.object({ name: z.string().min(1) }),
    types: z
      .array(
        z.object({
          name: z.string().min(1),
          kind: z.string().min(1),
          description: z.string().nullable().optional(),
          fields: z.array(introspectionFieldSchema).nullable().optional()
        })
      )
      .min(1)
  })
});
export let queryIntrospectionSchema = z.object({
  __schema: z.object({ queryType: z.object({ fields: z.array(introspectionFieldSchema) }) })
});
export let resolveType = (
  type: TypeReference,
  depth = 0
): { name: string; signature: string } => {
  if (depth > 16)
    throw createApiServiceError(
      'Contentful returned an unresolved schema type. Retry schema discovery.',
      { reason: 'invalid_response' }
    );
  if (type.kind === 'LIST' || type.kind === 'NON_NULL') {
    if (!type.ofType || type.name)
      throw createApiServiceError(
        'Contentful returned an incomplete schema type. Retry schema discovery.',
        { reason: 'invalid_response' }
      );
    let nested = resolveType(type.ofType, depth + 1);
    return {
      name: nested.name,
      signature: type.kind === 'LIST' ? `[${nested.signature}]` : `${nested.signature}!`
    };
  }
  if (!type.name)
    throw createApiServiceError(
      'Contentful returned a schema type without a name. Retry schema discovery.',
      { reason: 'invalid_response' }
    );
  return { name: type.name, signature: type.name };
};

export let spaceListInputSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .describe('Maximum spaces per page, up to 1000. Defaults to the provider limit.'),
  skip: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe('Offset for offset pagination. Do not combine with cursor pagination.'),
  cursor: z
    .boolean()
    .optional()
    .describe(
      'Use native cursor pagination. Reuse returned pages.next or pages.prev without changing filters.'
    ),
  pageNext: z
    .string()
    .optional()
    .describe(
      'Native next cursor or same-region continuation URL returned by pages.next. Requires cursor=true.'
    ),
  pagePrev: z
    .string()
    .optional()
    .describe(
      'Native previous cursor or same-region continuation URL returned by pages.prev. Requires cursor=true.'
    ),
  query: z
    .string()
    .optional()
    .describe(
      'Exact space ID or partial space name search. Omit for unfiltered discovery; an empty search is rejected.'
    )
});
export let spacePageSchema = z.object({
  sys: z.object({ type: z.literal('Array') }),
  items: z.array(
    z.object({
      name: z.string(),
      sys: z.object({
        id: z.string().min(1),
        type: z.literal('Space'),
        organization: z.object({ sys: z.object({ id: z.string().min(1) }) }).optional()
      })
    })
  ),
  skip: z.number().int().nonnegative().optional(),
  limit: z.number().int().positive().optional(),
  total: z.number().int().nonnegative().optional(),
  pages: z
    .object({ next: z.string().min(1).optional(), prev: z.string().min(1).optional() })
    .optional()
});
