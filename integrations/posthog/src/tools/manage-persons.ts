import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listPersonsTool = SlateTool.create(spec, {
  name: 'List Persons',
  key: 'list_persons',
  description: `Search and list person profiles in PostHog. Supports filtering by search query and person properties.
Returns paginated results with person details including distinct IDs and properties.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      search: z
        .string()
        .optional()
        .describe('Search query to filter persons by email, name, or distinct ID'),
      properties: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Property filters as PostHog property filter objects'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results to return (default 100)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      persons: z.array(
        z.object({
          personId: z.string().describe('PostHog internal person ID'),
          distinctIds: z
            .array(z.string())
            .describe('All distinct IDs associated with this person'),
          properties: z.record(z.string(), z.any()).describe('Person properties'),
          createdAt: z.string().describe('When the person was first seen')
        })
      ),
      totalCount: z.number().optional().describe('Total count of matching persons'),
      hasMore: z.boolean().describe('Whether there are more results available')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let data = await client.listPersons({
      search: ctx.input.search,
      properties: ctx.input.properties,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let persons = (data.results || []).map((p: any) => ({
      personId: String(p.id),
      distinctIds: p.distinct_ids || [],
      properties: p.properties || {},
      createdAt: p.created_at || ''
    }));

    return {
      output: {
        persons,
        totalCount: data.count,
        hasMore: !!data.next
      },
      message: `Found **${persons.length}** person(s)${data.count ? ` of ${data.count} total` : ''}.`
    };
  })
  .build();

export let getPersonTool = SlateTool.create(spec, {
  name: 'Get Person',
  key: 'get_person',
  description: `Retrieve detailed information about a specific person by their PostHog person ID.
Returns the person's distinct IDs, all properties, and creation timestamp.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      personId: z.string().describe('PostHog internal person ID')
    })
  )
  .output(
    z.object({
      personId: z.string().describe('PostHog internal person ID'),
      distinctIds: z
        .array(z.string())
        .describe('All distinct IDs associated with this person'),
      properties: z.record(z.string(), z.any()).describe('Person properties'),
      createdAt: z.string().describe('When the person was first seen')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let p = await client.getPerson(ctx.input.personId);

    return {
      output: {
        personId: String(p.id),
        distinctIds: p.distinct_ids || [],
        properties: p.properties || {},
        createdAt: p.created_at || ''
      },
      message: `Retrieved person **${p.distinct_ids?.[0] || p.id}**.`
    };
  })
  .build();

export let deletePersonTool = SlateTool.create(spec, {
  name: 'Delete Person',
  key: 'delete_person',
  description: `Permanently delete a person profile from PostHog. This removes the person and all their associated data.
To create or update persons, use the Capture Event tool with \`$identify\` event and \`set\`/\`setOnce\` properties instead.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      personId: z.string().describe('PostHog internal person ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the person was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.deletePerson(ctx.input.personId);

    return {
      output: { deleted: true },
      message: `Deleted person **${ctx.input.personId}**.`
    };
  })
  .build();
