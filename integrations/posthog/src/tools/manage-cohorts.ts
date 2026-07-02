import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let cohortOutput = z.object({
  cohortId: z.string().describe('Cohort ID'),
  name: z.string().describe('Cohort name'),
  description: z.string().optional().describe('Cohort description'),
  count: z.number().optional().describe('Number of users in the cohort'),
  isStatic: z.boolean().optional().describe('Whether this is a static cohort (vs dynamic)'),
  isCalculating: z
    .boolean()
    .optional()
    .describe('Whether the cohort is currently being calculated'),
  groups: z.array(z.record(z.string(), z.any())).optional().describe('Cohort filter groups'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

export let listCohortsTool = SlateTool.create(spec, {
  name: 'List Cohorts',
  key: 'list_cohorts',
  description: `List all cohorts in the project. Cohorts are groups of users that match specific criteria.
Static cohorts are manually managed lists, while dynamic cohorts are automatically updated every 24 hours.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      basic: z
        .boolean()
        .optional()
        .describe('Return a lighter cohort representation when supported'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      cohorts: z.array(cohortOutput),
      hasMore: z.boolean().describe('Whether there are more results')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let data = await client.listCohorts({
      basic: ctx.input.basic,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let cohorts = (data.results || []).map((c: any) => ({
      cohortId: String(c.id),
      name: c.name,
      description: c.description,
      count: c.count,
      isStatic: c.is_static,
      isCalculating: c.is_calculating,
      groups: c.groups,
      createdAt: c.created_at
    }));

    return {
      output: { cohorts, hasMore: !!data.next },
      message: `Found **${cohorts.length}** cohort(s).`
    };
  })
  .build();

export let getCohortTool = SlateTool.create(spec, {
  name: 'Get Cohort',
  key: 'get_cohort',
  description: `Retrieve detailed information about a specific cohort by its ID.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      cohortId: z.string().describe('Cohort ID')
    })
  )
  .output(cohortOutput)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let c = await client.getCohort(ctx.input.cohortId);

    return {
      output: {
        cohortId: String(c.id),
        name: c.name,
        description: c.description,
        count: c.count,
        isStatic: c.is_static,
        isCalculating: c.is_calculating,
        groups: c.groups,
        createdAt: c.created_at
      },
      message: `Retrieved cohort **${c.name}** with ${c.count ?? 'unknown'} users.`
    };
  })
  .build();

export let createCohortTool = SlateTool.create(spec, {
  name: 'Create Cohort',
  key: 'create_cohort',
  description: `Create a new cohort. Static cohorts are manually managed user lists; dynamic cohorts automatically include users matching specified criteria.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Cohort name'),
      description: z.string().optional().describe('Cohort description'),
      isStatic: z
        .boolean()
        .optional()
        .describe('Whether this is a static cohort (default false = dynamic)'),
      groups: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Filter groups defining who is included in the cohort')
    })
  )
  .output(cohortOutput)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let payload: Record<string, any> = { name: ctx.input.name };
    if (ctx.input.description !== undefined) payload.description = ctx.input.description;
    if (ctx.input.isStatic !== undefined) payload.is_static = ctx.input.isStatic;
    if (ctx.input.groups !== undefined) payload.groups = ctx.input.groups;

    let c = await client.createCohort(payload);

    return {
      output: {
        cohortId: String(c.id),
        name: c.name,
        description: c.description,
        count: c.count,
        isStatic: c.is_static,
        isCalculating: c.is_calculating,
        groups: c.groups,
        createdAt: c.created_at
      },
      message: `Created cohort **${c.name}** (ID: ${c.id}).`
    };
  })
  .build();

export let updateCohortTool = SlateTool.create(spec, {
  name: 'Update Cohort',
  key: 'update_cohort',
  description: `Update an existing cohort's name, description, static state, or filter groups.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      cohortId: z.string().describe('Cohort ID to update'),
      name: z.string().optional().describe('New cohort name'),
      description: z.string().optional().describe('New cohort description'),
      isStatic: z.boolean().optional().describe('Whether this is a static cohort'),
      groups: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Updated filter groups defining who is included in the cohort')
    })
  )
  .output(cohortOutput)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let payload: Record<string, any> = {};
    if (ctx.input.name !== undefined) payload.name = ctx.input.name;
    if (ctx.input.description !== undefined) payload.description = ctx.input.description;
    if (ctx.input.isStatic !== undefined) payload.is_static = ctx.input.isStatic;
    if (ctx.input.groups !== undefined) payload.groups = ctx.input.groups;

    let c = await client.updateCohort(ctx.input.cohortId, payload);

    return {
      output: {
        cohortId: String(c.id),
        name: c.name,
        description: c.description,
        count: c.count,
        isStatic: c.is_static,
        isCalculating: c.is_calculating,
        groups: c.groups,
        createdAt: c.created_at
      },
      message: `Updated cohort **${c.name}**.`
    };
  })
  .build();

export let deleteCohortTool = SlateTool.create(spec, {
  name: 'Delete Cohort',
  key: 'delete_cohort',
  description: `Permanently delete a cohort from PostHog.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      cohortId: z.string().describe('Cohort ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the cohort was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.deleteCohort(ctx.input.cohortId);

    return {
      output: { deleted: true },
      message: `Deleted cohort **${ctx.input.cohortId}**.`
    };
  })
  .build();
