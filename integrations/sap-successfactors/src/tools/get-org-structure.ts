import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getOrgStructure = SlateTool.create(spec, {
  name: 'Get Org Structure',
  key: 'get_org_structure',
  description: `Query organizational structure entities from SAP SuccessFactors including departments, divisions, positions, cost centers, locations, and companies. Useful for understanding organizational hierarchy and structure.`,
  instructions: [
    'Use the entityType parameter to select which organizational entity to query',
    'Positions include parent-child relationships via the parentPosition field'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      entityType: z
        .enum(['department', 'division', 'position', 'costCenter', 'location', 'company'])
        .describe('The type of organizational entity to query'),
      asOfDate: z
        .string()
        .optional()
        .describe(
          'Effective date in YYYY-MM-DD. Without a date range SAP normally returns records effective today.'
        ),
      fromDate: z
        .string()
        .optional()
        .describe('Start of effective-date range; cannot combine with asOfDate.'),
      toDate: z
        .string()
        .optional()
        .describe('End of effective-date range; cannot combine with asOfDate.'),
      filter: z.string().optional().describe('OData $filter expression'),
      select: z.string().optional().describe('Comma-separated fields to return'),
      expand: z.string().optional().describe('Navigation properties to expand'),
      top: z.number().optional().describe('Maximum number of records').default(100),
      nextPage: z
        .string()
        .optional()
        .describe(
          'Exact nextLink from the preceding result. Keep the entity and original query unchanged; do not combine with skip.'
        ),
      skip: z.number().optional().describe('Number of records to skip')
    })
  )
  .output(
    z.object({
      entities: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of organizational structure entities'),
      nextLink: z
        .string()
        .optional()
        .describe(
          'Exact provider continuation URL; pass it as nextPage to retrieve the next page.'
        ),
      hasMore: z.boolean().optional().describe('Whether SAP returned another page.'),
      totalCount: z.number().optional().describe('Total count of matching records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiServerUrl: ctx.auth.apiServerUrl
    });

    let queryFn: (
      options?: Parameters<typeof client.queryDepartments>[0]
    ) => ReturnType<typeof client.queryDepartments>;

    switch (ctx.input.entityType) {
      case 'department':
        queryFn = o => client.queryDepartments(o);
        break;
      case 'division':
        queryFn = o => client.queryDivisions(o);
        break;
      case 'position':
        queryFn = o => client.queryPositions(o);
        break;
      case 'costCenter':
        queryFn = o => client.queryCostCenters(o);
        break;
      case 'location':
        queryFn = o => client.queryLocations(o);
        break;
      case 'company':
        queryFn = o => client.queryCompanies(o);
        break;
    }

    let result = await queryFn({
      asOfDate: ctx.input.asOfDate,
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      filter: ctx.input.filter,
      select: ctx.input.select,
      expand: ctx.input.expand,
      top: ctx.input.top,
      skip: ctx.input.skip,
      nextPage: ctx.input.nextPage,
      inlineCount: true
    });

    return {
      output: {
        entities: result.results,
        totalCount: result.count,
        nextLink: result.nextLink,
        hasMore: result.hasMore
      },
      message: `Retrieved **${result.results.length}** ${ctx.input.entityType} records`
    };
  })
  .build();
