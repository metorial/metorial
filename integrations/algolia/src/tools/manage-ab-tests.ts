import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { AlgoliaClient } from '../lib/client';
import { spec } from '../spec';

export let manageAbTests = SlateTool.create(spec, {
  name: 'Manage A/B Tests',
  key: 'manage_ab_tests',
  description: `List, get, create, stop, or delete A/B tests in Algolia. A/B tests allow you to compare the performance of two index configurations (variants) by splitting traffic between them over a defined period.`,
  instructions: [
    'Use action "list" to retrieve all A/B tests. Optionally provide offset and limit for pagination.',
    'Use action "get" with an abTestId to retrieve details of a specific A/B test.',
    'Use action "create" to create a new A/B test. Provide name, variants (array of at least 2 variants with indexName, trafficPercentage, and optional description), and endAt (ISO 8601 date string).',
    'Use action "stop" with an abTestId to stop a running A/B test.',
    'Use action "delete" with an abTestId to permanently delete an A/B test.',
    'Each variant trafficPercentage must be between 0 and 100.',
    'Uses the legacy A/B Testing v2 API. Algolia recommends v3 for new A/B testing implementations.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'stop', 'delete'])
        .describe('The action to perform on A/B tests'),
      abTestId: z
        .number()
        .optional()
        .describe('The ID of the A/B test (required for get, stop, and delete actions)'),
      name: z
        .string()
        .optional()
        .describe('Name of the A/B test (required for create action)'),
      variants: z
        .array(
          z.object({
            indexName: z.string().describe('Name of the Algolia index for this variant'),
            trafficPercentage: z
              .number()
              .describe('Percentage of traffic to route to this variant (0 to 100)'),
            description: z
              .string()
              .optional()
              .describe('Optional description for this variant')
          })
        )
        .optional()
        .describe(
          'Array of variant configurations (required for create action, at least 2 variants)'
        ),
      endAt: z
        .string()
        .optional()
        .describe(
          'End date for the A/B test in ISO 8601 format (required for create action, e.g., "2024-12-31T23:59:59Z")'
        ),
      offset: z.number().optional().describe('Pagination offset for list action (default: 0)'),
      limit: z
        .number()
        .optional()
        .describe('Number of A/B tests to return for list action (default: 10)')
    })
  )
  .output(z.any())
  .handleInvocation(async ctx => {
    let client = new AlgoliaClient({
      applicationId: ctx.auth.applicationId,
      token: ctx.auth.token,
      analyticsRegion: ctx.config.analyticsRegion
    });

    let { action } = ctx.input;

    if (action === 'list') {
      let params: Record<string, any> = {};
      if (ctx.input.offset !== undefined) params.offset = ctx.input.offset;
      if (ctx.input.limit !== undefined) params.limit = ctx.input.limit;

      let result = await client.listAbTests(params);

      let count = Array.isArray(result.abtests)
        ? result.abtests.length
        : result.abtests === null
          ? 0
          : undefined;
      let summary =
        count !== undefined ? `Retrieved **${count}** A/B test(s)` : 'Retrieved A/B test list';
      let total = typeof result.total === 'number' ? ` (total: ${result.total})` : '';

      return {
        output: result,
        message: `${summary}${total}.`
      };
    }

    if (action === 'get') {
      if (ctx.input.abTestId === undefined) {
        throw createApiServiceError('abTestId is required for the "get" action.');
      }

      let result = await client.getAbTest(ctx.input.abTestId);

      return {
        output: result,
        message: `Retrieved A/B test **${result.name ?? ctx.input.abTestId}** (status: ${result.status ?? 'unknown'}).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) {
        throw createApiServiceError('name is required for the "create" action.');
      }
      if (!ctx.input.variants || ctx.input.variants.length < 2) {
        throw createApiServiceError(
          'At least 2 variants are required for the "create" action.'
        );
      }
      if (!ctx.input.endAt) {
        throw createApiServiceError('endAt is required for the "create" action.');
      }
      if (!Number.isFinite(Date.parse(ctx.input.endAt))) {
        throw createApiServiceError('endAt must be a valid ISO 8601 date and time.');
      }
      if (
        ctx.input.variants.some(
          variant => variant.trafficPercentage < 0 || variant.trafficPercentage > 100
        )
      ) {
        throw createApiServiceError(
          'Variant trafficPercentage values must each be between 0 and 100.'
        );
      }

      let params: Record<string, any> = {
        name: ctx.input.name,
        variants: ctx.input.variants.map(({ indexName, ...variant }) => ({
          index: indexName,
          ...variant
        })),
        endAt: ctx.input.endAt
      };

      let result = await client.createAbTest(params);

      return {
        output: result,
        message: `Created A/B test **${ctx.input.name}** (ID: ${result.abTestID ?? 'unknown'}), ending at ${ctx.input.endAt}.`
      };
    }

    if (action === 'stop') {
      if (ctx.input.abTestId === undefined) {
        throw createApiServiceError('abTestId is required for the "stop" action.');
      }

      let result = await client.stopAbTest(ctx.input.abTestId);

      return {
        output: result,
        message: `Stopped A/B test with ID **${ctx.input.abTestId}**.`
      };
    }

    // action === 'delete'
    if (ctx.input.abTestId === undefined) {
      throw createApiServiceError('abTestId is required for the "delete" action.');
    }

    let result = await client.deleteAbTest(ctx.input.abTestId);

    return {
      output: result,
      message: `Deleted A/B test with ID **${ctx.input.abTestId}**.`
    };
  })
  .build();
