import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSuccessionPlanning = SlateTool.create(spec, {
  name: 'Get Succession Planning',
  key: 'get_succession_planning',
  description: `Query succession planning data including nominees and talent pools from SAP SuccessFactors. Returns information about succession candidates, their readiness levels, rankings, and talent pool memberships.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      entityType: z
        .enum(['nominees', 'talentPools'])
        .describe('Whether to query succession nominees or talent pools'),
      filter: z.string().optional().describe('OData $filter expression'),
      select: z.string().optional().describe('Comma-separated fields to return'),
      expand: z.string().optional().describe('Navigation properties to expand'),
      top: z.number().optional().describe('Maximum records to return').default(100),
      skip: z.number().optional().describe('Number of records to skip')
    })
  )
  .output(
    z.object({
      records: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of succession nominees or talent pool records'),
      totalCount: z.number().optional().describe('Total count of matching records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiServerUrl: ctx.auth.apiServerUrl
    });

    let result =
      ctx.input.entityType === 'nominees'
        ? await client.querySuccessionNominees({
            filter: ctx.input.filter,
            select: ctx.input.select,
            expand: ctx.input.expand,
            top: ctx.input.top,
            skip: ctx.input.skip,
            inlineCount: true
          })
        : await client.queryTalentPools({
            filter: ctx.input.filter,
            select: ctx.input.select,
            expand: ctx.input.expand,
            top: ctx.input.top,
            skip: ctx.input.skip,
            inlineCount: true
          });

    let label = ctx.input.entityType === 'nominees' ? 'succession nominees' : 'talent pools';

    return {
      output: {
        records: result.results,
        totalCount: result.count
      },
      message: `Retrieved **${result.results.length}** ${label}`
    };
  })
  .build();
