import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFeaturesTool = SlateTool.create(spec, {
  name: 'List Features',
  key: 'list_features',
  description: `List features from the product hierarchy. Supports pagination and filtering by update time. Returns features with their status, parent hierarchy, timeframes, and assignments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageCursor: z
        .string()
        .optional()
        .describe(
          'Cursor for pagination; use the value from the previous response to get the next page'
        ),
      pageLimit: z
        .number()
        .optional()
        .describe('Maximum number of features to return per page'),
      updatedSince: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp to filter features updated after this time')
    })
  )
  .output(
    z.object({
      features: z.array(z.record(z.string(), z.any())).describe('List of features'),
      pageCursor: z
        .string()
        .optional()
        .describe('Cursor for the next page, if more results exist'),
      totalResults: z.number().optional().describe('Total number of matching features')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listFeatures({
      pageCursor: ctx.input.pageCursor,
      pageLimit: ctx.input.pageLimit,
      updatedSince: ctx.input.updatedSince
    });

    return {
      output: {
        features: result.data,
        pageCursor: result.pageCursor,
        totalResults: result.totalResults
      },
      message: `Retrieved ${result.data.length} feature(s).${result.pageCursor ? ' More results available.' : ''}`
    };
  })
  .build();
