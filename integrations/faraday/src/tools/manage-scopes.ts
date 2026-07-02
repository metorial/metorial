import { SlateTool } from 'slates';
import { z } from 'zod';
import { FaradayClient } from '../lib/client';
import { spec } from '../spec';

let scopeSchema = z.object({
  scopeId: z.string().describe('Unique identifier of the scope'),
  name: z.string().describe('Human-readable name of the scope'),
  status: z
    .string()
    .optional()
    .describe('Current status: new, starting, running, ready, or error'),
  populationCount: z.number().optional().describe('Total people in scope'),
  createdAt: z.string().optional().describe('Timestamp when the scope was created'),
  updatedAt: z.string().optional().describe('Timestamp when the scope was last updated')
});

export let listScopes = SlateTool.create(spec, {
  name: 'List Scopes',
  key: 'list_scopes',
  description: `Retrieve all scopes in your Faraday account. Scopes combine target populations, exclusion cohorts, and prediction payloads into deployable units that define what predictions are generated for whom.`,
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      scopes: z.array(scopeSchema).describe('List of all scopes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FaradayClient({ token: ctx.auth.token });
    let scopes = await client.listScopes();

    let mapped = scopes.map((s: any) => ({
      scopeId: s.id,
      name: s.name,
      status: s.status,
      populationCount: s.population_count,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }));

    return {
      output: { scopes: mapped },
      message: `Found **${mapped.length}** scope(s).`
    };
  })
  .build();

export let getScope = SlateTool.create(spec, {
  name: 'Get Scope',
  key: 'get_scope',
  description: `Retrieve detailed information about a specific scope, including its population configuration, payload, and processing status.`,
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      scopeId: z.string().describe('UUID of the scope to retrieve')
    })
  )
  .output(
    scopeSchema.extend({
      population: z
        .record(z.string(), z.any())
        .optional()
        .describe('Population configuration including included and excluded cohort IDs'),
      payload: z
        .record(z.string(), z.any())
        .optional()
        .describe('Payload configuration including outcome IDs, persona set IDs, etc.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FaradayClient({ token: ctx.auth.token });
    let s = await client.getScope(ctx.input.scopeId);

    return {
      output: {
        scopeId: s.id,
        name: s.name,
        status: s.status,
        populationCount: s.population_count,
        population: s.population,
        payload: s.payload,
        createdAt: s.created_at,
        updatedAt: s.updated_at
      },
      message: `Scope **${s.name}** is **${s.status}** with ${s.population_count ?? 'unknown'} individuals.`
    };
  })
  .build();

export let createScope = SlateTool.create(spec, {
  name: 'Create Scope',
  key: 'create_scope',
  description: `Create a new scope to define a prediction deployment. A scope combines a target population (cohorts), optional exclusion cohorts, and a payload of predictions (outcomes, persona sets, recommenders, cohort memberships, traits) into a deployable unit.`,
  instructions: [
    'Population must include at least one cohort ID.',
    'Payload defines what predictions to generate. Include outcome IDs for propensity scores, persona set IDs for segmentation, etc.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Unique human-readable name for the scope'),
      population: z
        .object({
          cohortIds: z
            .array(z.string())
            .describe('Array of cohort UUIDs to include in the population'),
          exclusionCohortIds: z
            .array(z.string())
            .optional()
            .describe('Array of cohort UUIDs to exclude')
        })
        .describe('Defines which people to include in predictions'),
      payload: z
        .object({
          outcomeIds: z
            .array(z.string())
            .optional()
            .describe('Outcome UUIDs to include propensity scores for'),
          personaSetIds: z
            .array(z.string())
            .optional()
            .describe('Persona set UUIDs to include assignments for'),
          cohortIds: z
            .array(z.string())
            .optional()
            .describe('Additional cohort IDs for membership inclusion'),
          recommenderIds: z
            .array(z.string())
            .optional()
            .describe('Recommender UUIDs to include recommendations'),
          attributes: z
            .array(z.string())
            .optional()
            .describe('Trait/attribute names to include (prefix Faraday traits with "fig/")'),
          explainability: z
            .boolean()
            .optional()
            .describe('Whether to include prediction explainability')
        })
        .describe('Specifies what prediction data to include for each person'),
      preview: z
        .boolean()
        .optional()
        .describe('When true, provides limited records without billing')
    })
  )
  .output(scopeSchema)
  .handleInvocation(async ctx => {
    let client = new FaradayClient({ token: ctx.auth.token });

    let body: Record<string, any> = {
      name: ctx.input.name,
      population: {
        cohort_ids: ctx.input.population.cohortIds,
        ...(ctx.input.population.exclusionCohortIds && {
          exclusion_cohort_ids: ctx.input.population.exclusionCohortIds
        })
      },
      payload: {} as Record<string, any>
    };

    if (ctx.input.payload.outcomeIds) body.payload.outcome_ids = ctx.input.payload.outcomeIds;
    if (ctx.input.payload.personaSetIds)
      body.payload.persona_set_ids = ctx.input.payload.personaSetIds;
    if (ctx.input.payload.cohortIds) body.payload.cohort_ids = ctx.input.payload.cohortIds;
    if (ctx.input.payload.recommenderIds)
      body.payload.recommender_ids = ctx.input.payload.recommenderIds;
    if (ctx.input.payload.attributes) body.payload.attributes = ctx.input.payload.attributes;
    if (ctx.input.payload.explainability !== undefined)
      body.payload.explainability = ctx.input.payload.explainability;
    if (ctx.input.preview !== undefined) body.preview = ctx.input.preview;

    let s = await client.createScope(body);

    return {
      output: {
        scopeId: s.id,
        name: s.name,
        status: s.status,
        populationCount: s.population_count,
        createdAt: s.created_at,
        updatedAt: s.updated_at
      },
      message: `Created scope **${s.name}** (${s.id}). Status: **${s.status}**.`
    };
  })
  .build();
