import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listEventDefinitionsTool = SlateTool.create(spec, {
  name: 'List Event Definitions',
  key: 'list_event_definitions',
  description: `List all event definitions in the project. Event definitions describe the possible event names that have been captured.
Use this to discover which events are available for querying, filtering, and analysis.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search event names'),
      excludeHidden: z.boolean().optional().describe('Exclude hidden event definitions'),
      excludeStale: z.boolean().optional().describe('Exclude stale event definitions'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      eventDefinitions: z.array(
        z.object({
          eventDefinitionId: z.string().describe('Event definition ID'),
          name: z.string().describe('Event name'),
          volume30Day: z.number().optional().describe('Event count in the last 30 days'),
          query30Day: z
            .number()
            .optional()
            .describe('Number of queries using this event in the last 30 days'),
          lastSeenAt: z.string().optional().describe('When this event was last seen'),
          createdAt: z.string().optional().describe('When this event was first seen')
        })
      ),
      hasMore: z.boolean().describe('Whether there are more results')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let data = await client.listEventDefinitions({
      search: ctx.input.search,
      excludeHidden: ctx.input.excludeHidden,
      excludeStale: ctx.input.excludeStale,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let eventDefinitions = (data.results || []).map((e: any) => ({
      eventDefinitionId: String(e.id),
      name: e.name,
      volume30Day: e.volume_30_day,
      query30Day: e.query_usage_30_day,
      lastSeenAt: e.last_seen_at,
      createdAt: e.created_at
    }));

    return {
      output: { eventDefinitions, hasMore: !!data.next },
      message: `Found **${eventDefinitions.length}** event definition(s).`
    };
  })
  .build();

export let listPropertyDefinitionsTool = SlateTool.create(spec, {
  name: 'List Property Definitions',
  key: 'list_property_definitions',
  description: `List all property definitions in the project. Property definitions describe the possible properties that can be attached to events or persons.
Use this to discover available properties for filtering, grouping, and analysis.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search property names'),
      propertyType: z
        .enum(['event', 'person', 'group', 'session'])
        .optional()
        .describe('Filter by property type'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      propertyDefinitions: z.array(
        z.object({
          propertyDefinitionId: z.string().describe('Property definition ID'),
          name: z.string().describe('Property name'),
          propertyType: z
            .string()
            .optional()
            .describe('Type of property (event, person, group)'),
          isNumerical: z.boolean().optional().describe('Whether the property is numerical'),
          volume30Day: z.number().optional().describe('Usage count in the last 30 days'),
          query30Day: z
            .number()
            .optional()
            .describe('Number of queries using this property in the last 30 days')
        })
      ),
      hasMore: z.boolean().describe('Whether there are more results')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let data = await client.listPropertyDefinitions({
      search: ctx.input.search,
      type: ctx.input.propertyType,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let propertyDefinitions = (data.results || []).map((p: any) => ({
      propertyDefinitionId: String(p.id),
      name: p.name,
      propertyType: p.property_type,
      isNumerical: p.is_numerical,
      volume30Day: p.volume_30_day,
      query30Day: p.query_usage_30_day
    }));

    return {
      output: { propertyDefinitions, hasMore: !!data.next },
      message: `Found **${propertyDefinitions.length}** property definition(s).`
    };
  })
  .build();
