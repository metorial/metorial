import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAttributeDefinitions = SlateTool.create(spec, {
  name: 'List Attribute Definitions',
  key: 'list_attribute_definitions',
  description:
    'Lists attribute names, data types, and scopes to help build user or company filters and choose attributes for updates. Optionally filter by scope or event names.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      scope: z
        .enum(['event', 'group', 'group_membership', 'user'])
        .optional()
        .describe('Only include attributes associated with this object type.'),
      eventNames: z
        .array(z.string())
        .optional()
        .describe(
          'Only include attributes used by these events. Call list_event_definitions to find event names.'
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum definitions to return (1–100, default 10).'),
      startingAfter: z
        .string()
        .optional()
        .describe('Last attribute definition ID from the previous page.'),
      orderBy: z
        .string()
        .optional()
        .describe(
          'Sort by created_at, display_name, or name. Prefix with - for descending order.'
        )
    })
  )
  .output(
    z.object({
      attributeDefinitions: z
        .array(
          z.object({
            attributeDefinitionId: z.string(),
            name: z.string(),
            displayName: z.string(),
            description: z.string().nullable(),
            dataType: z.string(),
            scope: z.enum(['event', 'group', 'group_membership', 'user']),
            createdAt: z.string()
          })
        )
        .describe('Known attribute definitions'),
      hasMore: z.boolean().describe('Whether more definitions are available'),
      nextPageUrl: z.string().nullable().describe('URL for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, apiVersion: ctx.config.apiVersion });
    let result = await client.listAttributeDefinitions(ctx.input);
    return {
      output: {
        attributeDefinitions: result.data.map(definition => ({
          attributeDefinitionId: definition.id,
          name: definition.name,
          displayName: definition.display_name,
          description: definition.description,
          dataType: definition.data_type,
          scope: definition.scope,
          createdAt: definition.created_at
        })),
        hasMore: result.has_more,
        nextPageUrl: result.next_page_url
      },
      message: `Retrieved **${result.data.length}** attribute definition(s).`
    };
  })
  .build();
