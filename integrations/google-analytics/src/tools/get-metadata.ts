import { SlateTool } from 'slates';
import { z } from 'zod';
import { AnalyticsDataClient } from '../lib/client';
import {
  propertyIdInstructions,
  propertyIdSchema,
  resolvePropertyId
} from '../lib/properties';
import { googleAnalyticsActionScopes } from '../scopes';
import { spec } from '../spec';

export let getMetadata = SlateTool.create(spec, {
  name: 'Get Metadata',
  key: 'get_metadata',
  description: `Retrieve the available dimensions and metrics for a GA4 property. Use this to discover which fields can be used in report queries, including both standard and custom dimensions/metrics.

Returns the full catalog of available dimensions and metrics with their descriptions, types, and categories.`,
  instructions: propertyIdInstructions,
  tags: {
    readOnly: true
  }
})
  .scopes(googleAnalyticsActionScopes.getMetadata)
  .input(
    z.object({
      propertyId: propertyIdSchema
    })
  )
  .output(
    z.object({
      dimensions: z
        .array(
          z.object({
            apiName: z.string().optional(),
            uiName: z.string().optional(),
            description: z.string().optional(),
            category: z.string().optional(),
            customDefinition: z.boolean().optional()
          })
        )
        .optional(),
      metrics: z
        .array(
          z.object({
            apiName: z.string().optional(),
            uiName: z.string().optional(),
            description: z.string().optional(),
            category: z.string().optional(),
            type: z.string().optional(),
            expression: z.string().optional(),
            customDefinition: z.boolean().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new AnalyticsDataClient({
      token: ctx.auth.token
    });
    const propertyId = resolvePropertyId(ctx.input, ctx.config);

    let result = await client.getMetadata(propertyId);

    let dimensions = result.dimensions || [];
    let metrics = result.metrics || [];

    return {
      output: {
        dimensions,
        metrics
      },
      message: `Retrieved metadata: **${dimensions.length}** available dimensions and **${metrics.length}** available metrics.`
    };
  })
  .build();
