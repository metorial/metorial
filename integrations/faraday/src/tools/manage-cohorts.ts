import { SlateTool } from 'slates';
import { z } from 'zod';
import { FaradayClient } from '../lib/client';
import { spec } from '../spec';

let cohortSchema = z.object({
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
    if (ctx.input.streamConditions) body.stream_conditions = ctx.input.streamConditions;
    if (ctx.input.traits) body.traits = ctx.input.traits;
    if (ctx.input.placeConditions) body.place_conditions = ctx.input.placeConditions;
    if (ctx.input.recency) body.recency = ctx.input.recency;
    if (ctx.input.explore !== undefined) body.explore = ctx.input.explore;
    if (ctx.input.minCount !== undefined) body.min_count = ctx.input.minCount;
    if (ctx.input.maxCount !== undefined) body.max_count = ctx.input.maxCount;
    if (ctx.input.minValue !== undefined) body.min_value = ctx.input.minValue;
    if (ctx.input.maxValue !== undefined) body.max_value = ctx.input.maxValue;

    let c = await client.createCohort(body);

    return {
      output: {
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
    if (ctx.input.streamConditions) body.stream_conditions = ctx.input.streamConditions;
    if (ctx.input.traits) body.traits = ctx.input.traits;
    if (ctx.input.placeConditions) body.place_conditions = ctx.input.placeConditions;
    if (ctx.input.recency) body.recency = ctx.input.recency;

    let c = await client.updateCohort(ctx.input.cohortId, body);

    return {
      output: {
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
