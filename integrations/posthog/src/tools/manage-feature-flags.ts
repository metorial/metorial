import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let featureFlagOutput = z.object({
  flagId: z.string().describe('Feature flag ID'),
  key: z.string().describe('Feature flag key used in code'),
  name: z.string().optional().describe('Display name'),
  active: z.boolean().describe('Whether the flag is currently active'),
  rolloutPercentage: z.number().optional().describe('Rollout percentage if applicable'),
  isSimpleFlag: z.boolean().optional().describe('Whether this is a simple boolean flag'),
  filters: z
    .record(z.string(), z.any())
    .optional()
    .describe('Flag filter/targeting configuration'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

export let listFeatureFlagsTool = SlateTool.create(spec, {
  name: 'List Feature Flags',
  key: 'list_feature_flags',
  description: `List all feature flags in the project. Supports searching by flag key or name.
Returns flag configuration including key, active status, rollout percentage, and targeting rules.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search by flag key or name'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      flags: z.array(featureFlagOutput),
      hasMore: z.boolean().describe('Whether there are more results')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let data = await client.listFeatureFlags({
      search: ctx.input.search,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let flags = (data.results || []).map((f: any) => ({
      flagId: String(f.id),
      key: f.key,
      name: f.name,
      active: f.active,
      rolloutPercentage: f.rollout_percentage,
      isSimpleFlag: f.is_simple_flag,
      filters: f.filters,
      createdAt: f.created_at
    }));

    return {
      output: { flags, hasMore: !!data.next },
      message: `Found **${flags.length}** feature flag(s).`
    };
  })
  .build();

export let getFeatureFlagTool = SlateTool.create(spec, {
  name: 'Get Feature Flag',
  key: 'get_feature_flag',
  description: `Retrieve detailed information about a specific feature flag by its ID.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      flagId: z.string().describe('Feature flag ID')
    })
  )
  .output(featureFlagOutput)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let f = await client.getFeatureFlag(ctx.input.flagId);

    return {
      output: {
        flagId: String(f.id),
        key: f.key,
        name: f.name,
        active: f.active,
        rolloutPercentage: f.rollout_percentage,
        isSimpleFlag: f.is_simple_flag,
        filters: f.filters,
        createdAt: f.created_at
      },
      message: `Retrieved feature flag **${f.key}**.`
    };
  })
  .build();

export let createFeatureFlagTool = SlateTool.create(spec, {
  name: 'Create Feature Flag',
  key: 'create_feature_flag',
  description: `Create a new feature flag. Supports boolean flags, multivariate flags (for A/B test variants), and remote config flags.
Provide the key, name, and optionally configure rollout percentage and targeting filters.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      key: z.string().describe('Unique flag key used in code (e.g. "new-dashboard-design")'),
      name: z.string().optional().describe('Display name for the flag'),
      active: z.boolean().optional().describe('Whether the flag is active (default true)'),
      rolloutPercentage: z
        .number()
        .optional()
        .describe('Percentage of users who should see this flag (0-100)'),
      filters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Advanced targeting filters configuration')
    })
  )
  .output(featureFlagOutput)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let payload: Record<string, any> = { key: ctx.input.key };
    if (ctx.input.name !== undefined) payload.name = ctx.input.name;
    if (ctx.input.active !== undefined) payload.active = ctx.input.active;
    if (ctx.input.rolloutPercentage !== undefined)
      payload.rollout_percentage = ctx.input.rolloutPercentage;
    if (ctx.input.filters !== undefined) payload.filters = ctx.input.filters;

    let f = await client.createFeatureFlag(payload);

    return {
      output: {
        flagId: String(f.id),
        key: f.key,
        name: f.name,
        active: f.active,
        rolloutPercentage: f.rollout_percentage,
        isSimpleFlag: f.is_simple_flag,
        filters: f.filters,
        createdAt: f.created_at
      },
      message: `Created feature flag **${f.key}** (ID: ${f.id}).`
    };
  })
  .build();

export let updateFeatureFlagTool = SlateTool.create(spec, {
  name: 'Update Feature Flag',
  key: 'update_feature_flag',
  description: `Update an existing feature flag's name, active status, rollout percentage, or targeting configuration.
Only provided fields will be updated.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      flagId: z.string().describe('Feature flag ID to update'),
      name: z.string().optional().describe('New display name'),
      active: z.boolean().optional().describe('Enable or disable the flag'),
      rolloutPercentage: z.number().optional().describe('New rollout percentage (0-100)'),
      filters: z.record(z.string(), z.any()).optional().describe('Updated targeting filters')
    })
  )
  .output(featureFlagOutput)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let payload: Record<string, any> = {};
    if (ctx.input.name !== undefined) payload.name = ctx.input.name;
    if (ctx.input.active !== undefined) payload.active = ctx.input.active;
    if (ctx.input.rolloutPercentage !== undefined)
      payload.rollout_percentage = ctx.input.rolloutPercentage;
    if (ctx.input.filters !== undefined) payload.filters = ctx.input.filters;

    let f = await client.updateFeatureFlag(ctx.input.flagId, payload);

    return {
      output: {
        flagId: String(f.id),
        key: f.key,
        name: f.name,
        active: f.active,
        rolloutPercentage: f.rollout_percentage,
        isSimpleFlag: f.is_simple_flag,
        filters: f.filters,
        createdAt: f.created_at
      },
      message: `Updated feature flag **${f.key}**.`
    };
  })
  .build();

export let deleteFeatureFlagTool = SlateTool.create(spec, {
  name: 'Delete Feature Flag',
  key: 'delete_feature_flag',
  description: `Permanently delete a feature flag. This cannot be undone.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      flagId: z.string().describe('Feature flag ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the flag was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.deleteFeatureFlag(ctx.input.flagId);

    return {
      output: { deleted: true },
      message: `Deleted feature flag **${ctx.input.flagId}**.`
    };
  })
  .build();

export let evaluateFeatureFlagsTool = SlateTool.create(spec, {
  name: 'Evaluate Feature Flags',
  key: 'evaluate_feature_flags',
  description: `Evaluate all feature flags for a specific user (distinct ID). Returns the computed flag values based on the user's properties and targeting rules.
Optionally pass person properties and group properties inline for server-side evaluation without requiring prior identification.`,
  instructions: ['Requires a project token (configured in auth) for evaluation.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      distinctId: z.string().describe('The distinct ID of the user to evaluate flags for'),
      personProperties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Person properties to use for evaluation (overrides stored properties)'),
      groupProperties: z
        .record(z.string(), z.record(z.string(), z.any()))
        .optional()
        .describe('Group properties keyed by group type')
    })
  )
  .output(
    z.object({
      featureFlags: z
        .record(z.string(), z.any())
        .describe('Map of flag keys to their values (boolean or string variant)'),
      featureFlagPayloads: z
        .record(z.string(), z.any())
        .optional()
        .describe('Map of flag keys to their JSON payloads'),
      errorsWhileComputingFlags: z
        .boolean()
        .optional()
        .describe('Whether there were errors during computation')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let apiKey = ctx.auth.projectToken || ctx.auth.token;

    let result = await client.evaluateFeatureFlags({
      apiKey,
      distinctId: ctx.input.distinctId,
      personProperties: ctx.input.personProperties,
      groupProperties: ctx.input.groupProperties
    });

    let flagCount = Object.keys(result.featureFlags || {}).length;

    return {
      output: {
        featureFlags: result.featureFlags || {},
        featureFlagPayloads: result.featureFlagPayloads,
        errorsWhileComputingFlags: result.errorsWhileComputingFlags
      },
      message: `Evaluated **${flagCount}** feature flag(s) for distinct ID **${ctx.input.distinctId}**.`
    };
  })
  .build();
