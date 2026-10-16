import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { FaradayClient } from '../lib/client';
import { spec } from '../spec';

let comparisonSchema = z.object({
  _eq: z.string().optional(),
  _gt: z.number().optional(),
  _gte: z.number().optional(),
  _in: z.array(z.string()).optional(),
  _lt: z.number().optional(),
  _lte: z.number().optional(),
  _matches: z.string().optional(),
  _nin: z.array(z.string()).optional(),
  _nnull: z.boolean().optional(),
  _null: z.boolean().optional(),
  optional: z.boolean().optional()
});
let streamConditionSchema = comparisonSchema.extend({
  property: z.string(),
  _on_or_after: z.string().optional(),
  _on_or_before: z.string().optional()
});
let traitConditionSchema = comparisonSchema.extend({ name: z.string() });

// Older callers supplied a single condition object. Retain it and send the API's array form.
let conditionList = (
  legacy: Record<string, unknown> | undefined,
  list: Record<string, unknown>[] | undefined,
  field: string
) => {
  if (legacy !== undefined && list !== undefined) {
    throw createApiServiceError(`Use either ${field} or ${field}List, not both.`);
  }
  return list ?? (legacy === undefined ? undefined : [legacy]);
};

let validateRecency = (recency: Record<string, unknown> | undefined) => {
  for (let field of ['min_days', 'max_days']) {
    if (recency?.[field] !== undefined && !Number.isInteger(recency[field])) {
      throw createApiServiceError(`recency.${field} must be an integer number of days.`);
    }
  }
};

let cohortSchema = z.object({
  raw: z
    .record(z.string(), z.any())
    .optional()
    .describe('Complete provider resource metadata'),
  cohortId: z.string().describe('Unique identifier of the cohort'),
  name: z.string().describe('Human-readable name of the cohort'),
  status: z
    .string()
    .optional()
    .describe('Current status: new, starting, running, ready, or error'),
  populationCount: z
    .number()
    .optional()
    .describe('Number of unique individuals in the cohort'),
  residenceCount: z.number().optional().describe('Number of unique residences in the cohort'),
  createdAt: z.string().optional().describe('Timestamp when the cohort was created'),
  updatedAt: z.string().optional().describe('Timestamp when the cohort was last updated')
});

export let listCohorts = SlateTool.create(spec, {
  name: 'List Cohorts',
  key: 'list_cohorts',
  description: `Retrieve all cohorts in your Faraday account. Cohorts define populations of people based on event stream criteria (e.g., customers, leads, churned customers). Use this to discover available cohorts for building outcomes, scopes, or analysis.`,
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      cohorts: z.array(cohortSchema).describe('List of all cohorts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FaradayClient({ token: ctx.auth.token });
    let cohorts = await client.listCohorts();

    let mapped = cohorts.map((c: any) => ({
      raw: c,
      cohortId: c.id,
      name: c.name,
      status: c.status,
      populationCount: c.population_count,
      residenceCount: c.residence_count,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    return {
      output: { cohorts: mapped },
      message: `Found **${mapped.length}** cohort(s).`
    };
  })
  .build();

export let getCohort = SlateTool.create(spec, {
  name: 'Get Cohort',
  key: 'get_cohort',
  description: `Retrieve detailed information about a specific cohort, including its population count, status, and configuration.`,
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      cohortId: z.string().describe('UUID of the cohort to retrieve')
    })
  )
  .output(cohortSchema)
  .handleInvocation(async ctx => {
    let client = new FaradayClient({ token: ctx.auth.token });
    let c = await client.getCohort(ctx.input.cohortId);

    let output = {
      raw: c,
      cohortId: c.id,
      name: c.name,
      status: c.status,
      populationCount: c.population_count,
      residenceCount: c.residence_count,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    };

    return {
      output,
      message: `Cohort **${c.name}** is in **${c.status}** status with ${c.population_count ?? 'unknown'} individuals.`
    };
  })
  .build();

export let createCohort = SlateTool.create(spec, {
  name: 'Create Cohort',
  key: 'create_cohort',
  description: `Create a new cohort defining a population of people based on event stream criteria, traits, or place conditions. Cohorts serve as inputs for predictions and as population/exclusion filters in scopes.`,
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Human-readable name for the cohort (max 64 characters)'),
      streamName: z
        .string()
        .optional()
        .describe('Event stream name. Call list_streams to discover stream names.'),
      streamConditionsList: z
        .array(streamConditionSchema)
        .optional()
        .describe(
          'Event property conditions. Use instead of the single streamConditions object.'
        ),
      traitsList: z
        .array(traitConditionSchema)
        .optional()
        .describe('Trait conditions. Use instead of the single traits object.'),
      placeConditionsList: z
        .array(
          z.object({
            place_id: z.string(),
            distance: z.number().optional(),
            invert: z.boolean().optional()
          })
        )
        .optional()
        .describe('Spatial conditions. Use instead of the single placeConditions object.'),
      streamConditions: z
        .record(z.string(), z.any())
        .optional()
        .describe('Filter by properties from a specific event stream'),
      traits: z
        .record(z.string(), z.any())
        .optional()
        .describe('Filter by user characteristics with comparison operators'),
      placeConditions: z
        .record(z.string(), z.any())
        .optional()
        .describe('Spatial filtering using Place IDs with optional distance buffers'),
      recency: z
        .record(z.string(), z.any())
        .optional()
        .describe('Time-based filtering for event occurrence'),
      explore: z
        .boolean()
        .optional()
        .describe('Whether to display cohort in the Explore map view'),
      minCount: z.number().optional().describe('Minimum event count threshold'),
      maxCount: z.number().optional().describe('Maximum event count threshold'),
      minValue: z.number().optional().describe('Minimum event value threshold'),
      maxValue: z.number().optional().describe('Maximum event value threshold')
    })
  )
  .output(cohortSchema)
  .handleInvocation(async ctx => {
    let client = new FaradayClient({ token: ctx.auth.token });

    let body: Record<string, any> = { name: ctx.input.name };
    let streams = conditionList(
      ctx.input.streamConditions,
      ctx.input.streamConditionsList,
      'streamConditions'
    );
    let traits = conditionList(ctx.input.traits, ctx.input.traitsList, 'traits');
    let places = conditionList(
      ctx.input.placeConditions,
      ctx.input.placeConditionsList,
      'placeConditions'
    );
    validateRecency(ctx.input.recency);
    for (let condition of places ?? []) {
      if (condition.distance !== undefined && !Number.isInteger(condition.distance)) {
        throw createApiServiceError(
          'Each place condition distance must be an integer number of meters.'
        );
      }
    }
    if (ctx.input.streamName !== undefined) body.stream_name = ctx.input.streamName;
    if (streams !== undefined) body.stream_conditions = streams;
    if (traits !== undefined) body.traits = traits;
    if (places !== undefined) body.place_conditions = places;
    if (ctx.input.recency) body.recency = ctx.input.recency;
    if (ctx.input.explore !== undefined) body.explore = ctx.input.explore;
    if (ctx.input.minCount !== undefined) body.min_count = ctx.input.minCount;
    if (ctx.input.maxCount !== undefined) body.max_count = ctx.input.maxCount;
    if (ctx.input.minValue !== undefined) body.min_value = ctx.input.minValue;
    if (ctx.input.maxValue !== undefined) body.max_value = ctx.input.maxValue;

    let c = await client.createCohort(body);

    return {
      output: {
        raw: c,
        cohortId: c.id,
        name: c.name,
        status: c.status,
        populationCount: c.population_count,
        residenceCount: c.residence_count,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      },
      message: `Created cohort **${c.name}** (${c.id}).`
    };
  })
  .build();

export let updateCohort = SlateTool.create(spec, {
  name: 'Update Cohort',
  key: 'update_cohort',
  description: `Update an existing cohort's name, stream conditions, traits, or other filtering criteria.`,
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      cohortId: z.string().describe('UUID of the cohort to update'),
      name: z.string().optional().describe('New name for the cohort'),
      streamName: z
        .string()
        .optional()
        .describe('Event stream name. Call list_streams to discover stream names.'),
      streamConditionsList: z
        .array(streamConditionSchema)
        .optional()
        .describe(
          'Event property conditions. Use instead of the single streamConditions object.'
        ),
      traitsList: z
        .array(traitConditionSchema)
        .optional()
        .describe('Trait conditions. Use instead of the single traits object.'),
      placeConditionsList: z
        .array(
          z.object({
            place_id: z.string(),
            distance: z.number().optional(),
            invert: z.boolean().optional()
          })
        )
        .optional()
        .describe('Spatial conditions. Use instead of the single placeConditions object.'),
      streamConditions: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated stream conditions'),
      traits: z.record(z.string(), z.any()).optional().describe('Updated trait filters'),
      placeConditions: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated place conditions'),
      recency: z.record(z.string(), z.any()).optional().describe('Updated recency filter')
    })
  )
  .output(cohortSchema)
  .handleInvocation(async ctx => {
    let client = new FaradayClient({ token: ctx.auth.token });

    let body: Record<string, any> = {};
    if (ctx.input.name) body.name = ctx.input.name;
    let streams = conditionList(
      ctx.input.streamConditions,
      ctx.input.streamConditionsList,
      'streamConditions'
    );
    let traits = conditionList(ctx.input.traits, ctx.input.traitsList, 'traits');
    let places = conditionList(
      ctx.input.placeConditions,
      ctx.input.placeConditionsList,
      'placeConditions'
    );
    validateRecency(ctx.input.recency);
    for (let condition of places ?? []) {
      if (condition.distance !== undefined && !Number.isInteger(condition.distance)) {
        throw createApiServiceError(
          'Each place condition distance must be an integer number of meters.'
        );
      }
    }
    if (ctx.input.streamName !== undefined) body.stream_name = ctx.input.streamName;
    if (streams !== undefined) body.stream_conditions = streams;
    if (traits !== undefined) body.traits = traits;
    if (places !== undefined) body.place_conditions = places;
    if (ctx.input.recency) body.recency = ctx.input.recency;

    if (Object.keys(body).length === 0) {
      throw createApiServiceError('Provide at least one cohort field to update.');
    }

    let c = await client.updateCohort(ctx.input.cohortId, body);

    return {
      output: {
        raw: c,
        cohortId: c.id,
        name: c.name,
        status: c.status,
        populationCount: c.population_count,
        residenceCount: c.residence_count,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      },
      message: `Updated cohort **${c.name}**.`
    };
  })
  .build();

export let deleteCohort = SlateTool.create(spec, {
  name: 'Delete Cohort',
  key: 'delete_cohort',
  description: `Permanently delete a cohort from your Faraday account. This cannot be undone and may affect dependent resources like outcomes and scopes.`,
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      cohortId: z.string().describe('UUID of the cohort to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the cohort was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FaradayClient({ token: ctx.auth.token });
    await client.deleteCohort(ctx.input.cohortId);

    return {
      output: { deleted: true },
      message: `Deleted cohort **${ctx.input.cohortId}**.`
    };
  })
  .build();
