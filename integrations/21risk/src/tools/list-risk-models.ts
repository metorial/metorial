import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let riskModelSchema = z
  .object({
    riskModelId: z.string().optional().describe('Unique identifier of the risk model'),
    name: z.string().optional().describe('Name of the risk model'),
    description: z.string().optional().describe('Description of the risk model')
  })
  .passthrough();

export let listRiskModels = SlateTool.create(spec, {
  name: 'List Risk Models',
  key: 'list_risk_models',
  description: `Retrieve risk model definitions from 21RISK. Risk models define the structure of compliance checklists, with categories containing various question types (checkbox, select, number, slider, comment, currency, signature, location, etc.). Use $expand to include associated categories and questions.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      nextLink: z
        .string()
        .optional()
        .describe(
          'Continuation URL returned by this tool. Supply it alone to retrieve the next page.'
        ),
      filter: z.string().optional().describe('OData $filter expression'),
      select: z.string().optional().describe('Comma-separated list of fields to return'),
      expand: z
        .string()
        .optional()
        .describe('Related entities to expand (e.g., "Categories")'),
      orderby: z.string().optional().describe('Sort order'),
      top: z.number().optional().describe('Maximum number of records to return'),
      skip: z.number().optional().describe('Number of records to skip for pagination')
    })
  )
  .output(
    z.object({
      riskModels: z.array(riskModelSchema).describe('List of risk models'),
      nextLink: z
        .string()
        .optional()
        .describe('Provider continuation URL for the next page, when supplied'),
      totalCount: z
        .number()
        .optional()
        .describe('Provider total matching count, when supplied'),
      count: z.number().describe('Number of risk models returned in this page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let riskModels = await client.getRiskModels({
      nextLink: ctx.input.nextLink,
      filter: ctx.input.filter,
      select: ctx.input.select,
      expand: ctx.input.expand,
      orderby: ctx.input.orderby,
      top: ctx.input.top,
      skip: ctx.input.skip
    });

    let results = riskModels.records;

    return {
      output: {
        riskModels: results,
        count: results.length,
        nextLink: riskModels.nextLink,
        totalCount: riskModels.totalCount
      },
      message: `Retrieved **${results.length}** risk model(s).`
    };
  })
  .build();
