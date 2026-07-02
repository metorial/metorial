import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let refreshKeywords = SlateTool.create(spec, {
  name: 'Refresh Keywords',
  key: 'refresh_keywords',
  description: `Trigger an on-demand refresh of keyword rankings for one or more projects. This updates rankings immediately rather than waiting for the next scheduled update. Limited by your plan's refresh quota.`,
  constraints: ['Refresh quota depends on your Keyword.com subscription plan.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectIds: z.array(z.string()).describe('Array of project IDs to refresh'),
      includeSubGroups: z
        .boolean()
        .optional()
        .describe('Whether to include sub-groups in the refresh (default: true)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the refresh was triggered'),
      rawResponse: z.any().optional().describe('Raw API response with quota information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.refreshKeywords({
      projectIds: ctx.input.projectIds,
      includeSubGroups: ctx.input.includeSubGroups
    });

    return {
      output: {
        success: true,
        rawResponse: result
      },
      message: `Triggered keyword refresh for **${ctx.input.projectIds.length}** project(s).`
    };
  })
  .build();
