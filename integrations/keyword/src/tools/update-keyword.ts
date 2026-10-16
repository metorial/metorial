import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getResource, requireInteger, requireText } from '../lib/response';
import { spec } from '../spec';

export let updateKeyword = SlateTool.create(spec, {
  name: 'Update Keyword',
  key: 'update_keyword',
  description:
    'Update a tracked keyword without deleting its ranking history. Change its text, tracked URL, matching rules, complete tag set, baseline, favorite state, status, or move it to another project/group. Call list_projects and list_keywords to discover names and IDs.',
  instructions: ['tags replaces the complete tag set. Use an empty array to remove all tags.'],
  tags: { destructive: false }
})
  .input(
    z.object({
      projectName: z
        .string()
        .describe('Current project or full Parent[sub]Child group name from list_projects'),
      keywordId: z.string().describe('Keyword ID from list_keywords'),
      keyword: z.string().optional().describe('New keyword text'),
      url: z.string().optional().describe('New tracked URL or domain'),
      urlTrackingMethod: z.enum(['broad', 'exact']).optional(),
      ignoreSubDomains: z.boolean().optional(),
      destinationProjectName: z
        .string()
        .optional()
        .describe('Existing destination project or group name from list_projects'),
      baseline: z
        .number()
        .optional()
        .describe('Starting rank for change comparisons, an integer from 0 to 100'),
      tags: z.array(z.string()).optional().describe('Complete desired tag names'),
      favorite: z.boolean().optional(),
      status: z.enum(['inactive', 'active', 'archived']).optional()
    })
  )
  .output(z.object({ keyword: z.record(z.string(), z.any()), rawResponse: z.any() }))
  .handleInvocation(async ctx => {
    requireInteger(ctx.input.baseline, 'baseline', 0, 100);
    for (let [field, value] of [
      ['keyword', ctx.input.keyword],
      ['url', ctx.input.url],
      ['destinationProjectName', ctx.input.destinationProjectName]
    ] as const) {
      if (value !== undefined) requireText(value, field);
    }
    let attributes = pickDefined({
      kw: ctx.input.keyword,
      url: ctx.input.url,
      url_tracking_method: ctx.input.urlTrackingMethod,
      ignore_sub_domains: ctx.input.ignoreSubDomains,
      category: ctx.input.destinationProjectName,
      baseline: ctx.input.baseline,
      tags: ctx.input.tags,
      isfav: ctx.input.favorite,
      status:
        ctx.input.status === undefined
          ? undefined
          : { inactive: 0, active: 1, archived: 2 }[ctx.input.status]
    });
    if (Object.keys(attributes).length === 0)
      throw createApiServiceError('Provide at least one keyword field to update.');
    let response = await new Client({ token: ctx.auth.token }).updateKeyword({
      projectName: ctx.input.projectName,
      keywordId: ctx.input.keywordId,
      attributes
    });
    return {
      message: 'Updated the keyword.',
      output: { keyword: getResource(response), rawResponse: response }
    };
  })
  .build();
