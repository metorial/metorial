import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { createHighLevelClient } from '../lib/client';
import { highLevelScope } from '../lib/scopes';
import { spec } from '../spec';

const opportunitySchema = z
  .object({
    id: z.string().describe('Opportunity identifier.'),
    name: z.string().optional().describe('Opportunity name.'),
    locationId: z.string().optional().describe('Owning sub-account identifier.'),
    contactId: z.string().optional().describe('Associated contact identifier.'),
    pipelineId: z.string().optional().describe('Pipeline identifier.'),
    pipelineStageId: z.string().optional().describe('Pipeline stage identifier.'),
    status: z.string().optional().describe('Current provider status.'),
    monetaryValue: z.number().optional().describe('Opportunity value.'),
    assignedTo: z.string().nullable().optional().describe('Assigned user identifier.'),
    createdAt: z.string().optional().describe('Creation timestamp.'),
    updatedAt: z.string().optional().describe('Last modification timestamp.')
  })
  .passthrough();

const singleOpportunityOutput = z.object({
  locationId: z.string().describe('Connected sub-account identifier.'),
  opportunityId: z.string().describe('Opportunity identifier.'),
  opportunity: opportunitySchema.describe(
    'Opportunity details, including provider-specific fields.'
  )
});

const paginationSchema = z
  .object({
    total: z.number().optional().describe('Total matching results when supplied.'),
    currentPage: z.number().optional().describe('Current page when supplied.'),
    nextPage: z
      .union([z.number(), z.literal('')])
      .nullable()
      .optional()
      .describe(
        'Next page number when supplied; an empty string or null means there is no next page.'
      ),
    prevPage: z.number().nullable().optional().describe('Previous page number when supplied.'),
    nextPageUrl: z
      .string()
      .nullable()
      .optional()
      .describe(
        'Provider next-page URL when supplied; use the continuation inputs rather than passing this URL as page.'
      ),
    startAfter: z
      .union([z.string(), z.number()])
      .nullable()
      .optional()
      .describe(
        'Provider continuation timestamp in milliseconds; pass its string value to startAfter.'
      ),
    startAfterId: z
      .string()
      .nullable()
      .optional()
      .describe('Provider continuation identifier; pass with startAfter.')
  })
  .passthrough();

export const opportunitiesSearchOpportunityTool = SlateTool.create(spec, {
  key: 'opportunities_search_opportunity',
  name: 'Search Opportunities',
  description:
    'Search one page of opportunities in the connected sub-account, preserving provider pagination metadata.',
  instructions: [
    'Use opportunities_get_pipelines to discover pipeline and stage identifiers. For another page, pass non-null meta.startAfter as a string together with meta.startAfterId, or pass a numeric meta.nextPage as page. Empty-string or null meta.nextPage means there is no next page; never pass nextPageUrl as page.'
  ],
  tags: { readOnly: true }
})
  .scopes(highLevelScope('opportunities.readonly'))
  .input(
    z.object({
      q: z.string().max(75).optional().describe('Search query, up to 75 characters.'),
      status: z
        .enum(['open', 'won', 'lost', 'abandoned', 'all'])
        .optional()
        .describe('Opportunity status filter.'),
      campaignId: z.string().optional().describe('Campaign identifier filter.'),
      id: z.string().optional().describe('Opportunity identifier filter.'),
      order: z
        .string()
        .optional()
        .describe(
          'Provider sort order, such as added_asc, added_desc, name_asc, or name_desc.'
        ),
      date: z.string().optional().describe('Start date filter in provider date format.'),
      endDate: z.string().optional().describe('End date filter in provider date format.'),
      country: z.string().length(2).optional().describe('ISO 3166-1 alpha-2 country code.'),
      page: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe(
          'One-based page number. Prefer returned continuation values when available.'
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20)
        .describe('Maximum records for this page, up to 100.'),
      startAfter: z
        .string()
        .optional()
        .describe(
          'Provider continuation timestamp in epoch milliseconds, represented as a string.'
        ),
      startAfterId: z
        .string()
        .optional()
        .describe('Provider continuation opportunity identifier.'),
      getTasks: z.boolean().optional().describe('Include contact tasks when supported.'),
      getNotes: z.boolean().optional().describe('Include contact notes when supported.'),
      getCalendarEvents: z
        .boolean()
        .optional()
        .describe('Include contact calendar events when supported.'),
      pipelineId: z
        .string()
        .optional()
        .describe('Pipeline identifier from opportunities_get_pipelines.'),
      pipelineStageId: z
        .string()
        .optional()
        .describe('Stage identifier from opportunities_get_pipelines.'),
      contactId: z
        .string()
        .optional()
        .describe('Contact identifier from contacts_get_contacts.'),
      assignedTo: z.string().optional().describe('Assigned user identifier filter.')
    })
  )
  .output(
    z.object({
      locationId: z.string().describe('Connected sub-account identifier.'),
      opportunities: z
        .array(opportunitySchema)
        .describe('One page of matching opportunities.'),
      meta: paginationSchema.describe(
        'Provider pagination metadata, preserved without inventing cursors.'
      ),
      aggregations: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Provider aggregation results, when supplied.')
    })
  )
  .handleInvocation(async ctx => {
    const client = createHighLevelClient(ctx.auth);
    const result = await client.request<{
      opportunities?: z.infer<typeof opportunitySchema>[];
      meta?: z.infer<typeof paginationSchema>;
      aggregations?: Record<string, unknown>;
    }>({
      method: 'GET',
      path: '/opportunities/search',
      scope: 'opportunities.readonly',
      query: pickDefined({ ...ctx.input, locationId: client.locationId })
    });
    const opportunities = result.opportunities ?? [];
    for (const opportunity of opportunities) client.assertLocation(opportunity.locationId);
    return {
      output: {
        locationId: client.locationId,
        opportunities,
        meta: result.meta ?? {},
        aggregations: result.aggregations
      },
      message: `Retrieved ${opportunities.length} opportunities.`
    };
  })
  .build();

const pipelineSchema = z
  .object({
    id: z.string().describe('Pipeline identifier.'),
    name: z.string().describe('Pipeline name.'),
    stages: z
      .array(
        z
          .object({
            id: z.string().describe('Pipeline stage identifier.'),
            name: z.string().describe('Pipeline stage name.'),
            position: z.number().optional().describe('Stage position within the pipeline.')
          })
          .passthrough()
      )
      .optional()
      .describe('Pipeline stages when supplied.')
  })
  .passthrough();

export const opportunitiesGetPipelinesTool = SlateTool.create(spec, {
  key: 'opportunities_get_pipelines',
  name: 'Get Opportunity Pipelines',
  description:
    'Discover pipeline and stage identifiers and names in the connected sub-account.',
  tags: { readOnly: true }
})
  .scopes(highLevelScope('opportunities.readonly'))
  .input(z.object({}))
  .output(
    z.object({
      locationId: z.string().describe('Connected sub-account identifier.'),
      pipelines: z.array(pipelineSchema).describe('Available pipelines and their stages.')
    })
  )
  .handleInvocation(async ctx => {
    const client = createHighLevelClient(ctx.auth);
    const result = await client.request<{ pipelines?: z.infer<typeof pipelineSchema>[] }>({
      method: 'GET',
      path: '/opportunities/pipelines',
      scope: 'opportunities.readonly',
      query: { locationId: client.locationId }
    });
    const pipelines = result.pipelines ?? [];
    return {
      output: { locationId: client.locationId, pipelines },
      message: `Retrieved ${pipelines.length} pipelines.`
    };
  })
  .build();

export const opportunitiesGetOpportunityTool = SlateTool.create(spec, {
  key: 'opportunities_get_opportunity',
  name: 'Get Opportunity',
  description:
    'Retrieve an opportunity by its identifier from opportunities_search_opportunity.',
  tags: { readOnly: true }
})
  .scopes(highLevelScope('opportunities.readonly'))
  .input(
    z.object({
      id: z
        .string()
        .min(1)
        .describe('Opportunity identifier from opportunities_search_opportunity.')
    })
  )
  .output(singleOpportunityOutput)
  .handleInvocation(async ctx => {
    const client = createHighLevelClient(ctx.auth);
    const result = await client.request<{ opportunity: z.infer<typeof opportunitySchema> }>({
      method: 'GET',
      path: `/opportunities/${encodeURIComponent(ctx.input.id)}`,
      scope: 'opportunities.readonly'
    });
    client.assertLocation(result.opportunity.locationId);
    return {
      output: {
        locationId: client.locationId,
        opportunityId: result.opportunity.id,
        opportunity: result.opportunity
      },
      message: 'Retrieved opportunity.'
    };
  })
  .build();

export const opportunitiesUpdateOpportunityTool = SlateTool.create(spec, {
  key: 'opportunities_update_opportunity',
  name: 'Update Opportunity',
  description: 'Update only supplied opportunity fields, leaving omitted fields unchanged.',
  instructions: [
    'Discover opportunity identifiers with opportunities_search_opportunity and pipeline/stage identifiers with opportunities_get_pipelines.'
  ],
  tags: { readOnly: false }
})
  .scopes(highLevelScope('opportunities.write'))
  .input(
    z.object({
      id: z
        .string()
        .min(1)
        .describe('Opportunity identifier from opportunities_search_opportunity.'),
      pipelineId: z
        .string()
        .min(1)
        .optional()
        .describe('Destination pipeline identifier from opportunities_get_pipelines.'),
      name: z.string().min(1).optional().describe('New opportunity name.'),
      pipelineStageId: z
        .string()
        .min(1)
        .optional()
        .describe('Destination stage identifier from opportunities_get_pipelines.'),
      status: z
        .enum(['open', 'won', 'lost', 'abandoned'])
        .optional()
        .describe('New opportunity status.'),
      monetaryValue: z.number().optional().describe('New opportunity monetary value.'),
      forecastExpectedCloseDate: z
        .string()
        .optional()
        .describe('Expected closing date, preferably YYYY-MM-DD or ISO 8601.'),
      forecastProbability: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe('Forecast probability as a percentage.'),
      assignedTo: z
        .string()
        .optional()
        .describe('User identifier to assign the opportunity to.'),
      customFields: z
        .array(
          z.object({
            id: z
              .string()
              .min(1)
              .optional()
              .describe(
                'Opportunity custom-field identifier from locations_get_custom_fields with the opportunity model; provide id or key.'
              ),
            key: z
              .string()
              .min(1)
              .optional()
              .describe('Custom-field key; provide this or id.'),
            fieldValue: z
              .union([z.string(), z.array(z.string()), z.record(z.string(), z.unknown())])
              .describe(
                'New string, string-array, or object custom-field value, matching the custom-field type.'
              )
          })
        )
        .optional()
        .describe('Custom fields to update; omit to preserve existing values.')
    })
  )
  .output(singleOpportunityOutput)
  .handleInvocation(async ctx => {
    const { id, ...changes } = ctx.input;
    const body = pickDefined(changes);
    if (Object.keys(body).length === 0)
      throw createApiServiceError('Supply at least one opportunity field to update.');
    if (changes.customFields?.some(field => !field.id && !field.key))
      throw createApiServiceError('Each opportunity custom field requires an id or key.');
    const client = createHighLevelClient(ctx.auth);
    const result = await client.request<{ opportunity: z.infer<typeof opportunitySchema> }>({
      method: 'PUT',
      path: `/opportunities/${encodeURIComponent(id)}`,
      scope: 'opportunities.write',
      body
    });
    client.assertLocation(result.opportunity.locationId);
    return {
      output: {
        locationId: client.locationId,
        opportunityId: result.opportunity.id,
        opportunity: result.opportunity
      },
      message: 'Updated opportunity.'
    };
  })
  .build();

export const opportunitiesTools = [
  opportunitiesSearchOpportunityTool,
  opportunitiesGetPipelinesTool,
  opportunitiesGetOpportunityTool,
  opportunitiesUpdateOpportunityTool
];
