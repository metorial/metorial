import { SlateTool } from 'slates';
import { z } from 'zod';
import { GongClient } from '../lib/client';
import { spec } from '../spec';

export let getSettingsDefinitions = SlateTool.create(spec, {
  name: 'Get Settings Definitions',
  key: 'get_settings_definitions',
  description: `Retrieve Gong settings definitions for keyword trackers and scorecards. Use this before requesting call details or scorecard stats when you need tracker or scorecard IDs and names.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      type: z
        .enum(['trackers', 'scorecards', 'both'])
        .default('both')
        .describe('Which settings definitions to retrieve'),
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID for tracker definitions. Ignored for scorecards.')
    })
  )
  .output(
    z.object({
      trackers: z.array(z.any()).optional().describe('Keyword tracker definitions'),
      scorecards: z.array(z.any()).optional().describe('Scorecard definitions'),
      trackerCount: z.number().optional().describe('Number of trackers returned'),
      scorecardCount: z.number().optional().describe('Number of scorecards returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GongClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl
    });

    let trackers: any[] | undefined;
    let scorecards: any[] | undefined;

    if (ctx.input.type === 'trackers' || ctx.input.type === 'both') {
      let result = await client.getSettingsTrackers({ workspaceId: ctx.input.workspaceId });
      trackers = result.keywordTrackers || [];
    }

    if (ctx.input.type === 'scorecards' || ctx.input.type === 'both') {
      let result = await client.getSettingsScorecards();
      scorecards = result.scorecards || [];
    }

    return {
      output: {
        trackers,
        scorecards,
        trackerCount: trackers?.length,
        scorecardCount: scorecards?.length
      },
      message: `Retrieved Gong settings definitions.`
    };
  })
  .build();
