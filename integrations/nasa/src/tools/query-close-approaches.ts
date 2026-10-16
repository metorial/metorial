import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { NasaClient, validateInteger } from '../lib/client';
import { spec } from '../spec';

export let queryCloseApproaches = SlateTool.create(spec, {
  name: 'Query Close Approach Data',
  key: 'query_close_approaches',
  description:
    'Query JPL asteroid and comet close approaches with provider-accurate nullable measurements, optional diameters, object names, and pagination. Missing scientific measurements remain null.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      dateMin: z
        .string()
        .optional()
        .describe('Earliest approach date (YYYY-MM-DD, YYYY-MM-DDThh:mm:ss, or now)'),
      dateMax: z
        .string()
        .optional()
        .describe('Latest approach date, now, or +D days after now (up to 36525)'),
      distMax: z
        .string()
        .optional()
        .describe('Maximum distance, in AU or with LD suffix for lunar distances'),
      body: z
        .string()
        .optional()
        .describe('Approached body; defaults to Earth. ALL includes every body.'),
      designation: z
        .string()
        .optional()
        .describe('Small-body designation to retrieve, such as 433 or 2015 AB'),
      includeDiameter: z
        .boolean()
        .optional()
        .describe('Include available diameter and uncertainty measurements'),
      includeFullName: z.boolean().optional().describe('Include full object names'),
      sort: z
        .enum([
          'date',
          'dist',
          'dist-min',
          'v-inf',
          'v-rel',
          'h',
          'object',
          '-date',
          '-dist',
          '-dist-min',
          '-v-inf',
          '-v-rel',
          '-h',
          '-object'
        ])
        .optional()
        .describe('Sort key; prefix with a minus for descending order'),
      limit: z.number().optional().describe('Positive maximum number of rows to return'),
      offset: z.number().optional().describe('Positive starting record offset; requires limit')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Number of returned approach records'),
      total: z
        .number()
        .optional()
        .describe('Total matching records when the provider supplies pagination metadata'),
      fields: z.array(z.string()).describe('Column names corresponding to each row value'),
      data: z
        .array(z.array(z.string().nullable()))
        .describe('Complete data rows; unavailable measurements remain null'),
      raw: z.any().describe('Complete provider response, including signature and version')
    })
  )
  .handleInvocation(async ctx => {
    validateInteger(ctx.input.limit, 'Limit', 1);
    validateInteger(ctx.input.offset, 'Offset', 1);
    if (ctx.input.offset !== undefined && ctx.input.limit === undefined) {
      throw createApiServiceError('Provide limit when using offset.');
    }
    let client = new NasaClient({ token: ctx.auth.token });
    let result = await client.getSsdCloseApproach(ctx.input);
    return {
      output: {
        count: result.count,
        total: result.total,
        fields: result.fields ?? [],
        data: result.data ?? [],
        raw: result
      },
      message: `Retrieved **${result.count}** close approach records.`
    };
  })
  .build();
