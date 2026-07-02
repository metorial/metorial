import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let attributeValueSchema = z.object({
  date: z.string().describe('Date in YYYY-MM-DD format'),
  value: z.union([z.number(), z.string(), z.null()]).describe('Value for the date')
});

let attributeSchema = z.object({
  templateName: z.string().describe('Template identifier'),
  attributeName: z.string().describe('Unique attribute name'),
  label: z.string().describe('Human-readable label'),
  groupName: z.string().describe('Group the attribute belongs to'),
  groupLabel: z.string().describe('Human-readable group label'),
  priority: z.number().describe('Priority level of the attribute'),
  manual: z.boolean().describe('Whether the attribute is manually tracked'),
  active: z.boolean().describe('Whether the attribute is currently active'),
  valueType: z
    .number()
    .describe(
      'Value type code (0=quantity, 1=decimal, 2=string, 3=duration, 4=time of day, 5=percentage, 7=boolean, 8=scale)'
    ),
  valueTypeDescription: z.string().describe('Human-readable value type'),
  serviceName: z.string().nullable().describe('Name of the owning service'),
  serviceLabel: z.string().nullable().describe('Label of the owning service'),
  values: z.array(attributeValueSchema).optional().describe('Recent values when requested')
});

export let getAttributesTool = SlateTool.create(spec, {
  name: 'Get Attributes',
  key: 'get_attributes',
  description: `Retrieve the user's tracked attributes from Exist, optionally with their recent daily values. Filter by group (activity, sleep, mood, etc.) or specific attribute names. When values are included, up to 31 days of historical data can be fetched.`,
  instructions: [
    'Set includeValues to true to get recent daily values along with each attribute.',
    'Use the "days" parameter (max 31) to control how many days of historical values to fetch.',
    'Filter by groups using comma-separated group names like "activity,sleep,mood".',
    'Filter by specific attributes using comma-separated attribute names like "steps,sleep_minutes".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      groups: z
        .string()
        .optional()
        .describe('Comma-separated group names to filter by (e.g. "activity,sleep,mood")'),
      attributeNames: z
        .string()
        .optional()
        .describe('Comma-separated attribute names to filter by (e.g. "steps,sleep_minutes")'),
      includeValues: z
        .boolean()
        .optional()
        .describe('Whether to include recent daily values for each attribute'),
      days: z
        .number()
        .optional()
        .describe(
          'Number of days of values to return (max 31, default 1). Only used when includeValues is true.'
        ),
      dateMax: z
        .string()
        .optional()
        .describe(
          'Most recent date to include values for (YYYY-MM-DD). Only used when includeValues is true.'
        ),
      ownedOnly: z
        .boolean()
        .optional()
        .describe('Only return attributes owned by this service'),
      limit: z.number().optional().describe('Number of results per page (max 100)'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching attributes'),
      attributes: z.array(attributeSchema).describe('List of attributes'),
      hasMore: z.boolean().describe('Whether there are more pages of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

    let result: any;
    if (ctx.input.includeValues) {
      result = await client.getAttributesWithValues({
        groups: ctx.input.groups,
        attributes: ctx.input.attributeNames,
        days: ctx.input.days,
        dateMax: ctx.input.dateMax,
        limit: ctx.input.limit,
        page: ctx.input.page
      });
    } else if (ctx.input.ownedOnly) {
      result = await client.getOwnedAttributes({
        groups: ctx.input.groups,
        attributes: ctx.input.attributeNames,
        limit: ctx.input.limit,
        page: ctx.input.page
      });
    } else {
      result = await client.getAttributes({
        groups: ctx.input.groups,
        attributes: ctx.input.attributeNames,
        limit: ctx.input.limit,
        page: ctx.input.page
      });
    }

    let attributes = result.results.map((attr: any) => ({
      templateName: attr.template,
      attributeName: attr.name,
      label: attr.label,
      groupName: attr.group.name,
      groupLabel: attr.group.label,
      priority: attr.priority,
      manual: attr.manual,
      active: attr.active,
      valueType: attr.value_type,
      valueTypeDescription: attr.value_type_description,
      serviceName: attr.service?.name ?? null,
      serviceLabel: attr.service?.label ?? null,
      values: attr.values?.map((v: any) => ({ date: v.date, value: v.value }))
    }));

    return {
      output: {
        totalCount: result.count,
        attributes,
        hasMore: result.next !== null
      },
      message: `Found **${result.count}** attributes${ctx.input.groups ? ` in groups: ${ctx.input.groups}` : ''}. Returned ${attributes.length} on this page.`
    };
  })
  .build();
