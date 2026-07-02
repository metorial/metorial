import { SlateTool } from 'slates';
import { z } from 'zod';
import { EcologiClient } from '../lib/client';
import { spec } from '../spec';

export let getImpactTool = SlateTool.create(spec, {
  name: 'Get Impact',
  key: 'get_impact',
  description: `Retrieve impact statistics for any Ecologi user profile. Returns combined totals including trees planted and CO₂e tonnes avoided. Can also retrieve individual metrics (trees only or carbon offset only) by specifying the metric type. No API key is required — only the Ecologi username.`,
  instructions: [
    'Data refreshes every 10 minutes, so recent purchases may not be immediately reflected.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      username: z.string().describe('The Ecologi username to retrieve impact statistics for.'),
      metric: z
        .enum(['all', 'trees', 'carbon_offset'])
        .default('all')
        .describe(
          'Which metric to retrieve: "all" for combined impact, "trees" for tree count only, or "carbon_offset" for carbon offset only.'
        )
    })
  )
  .output(
    z.object({
      trees: z.number().optional().describe('Total number of trees planted (confirmed/paid).'),
      treesPending: z
        .number()
        .optional()
        .describe('Number of trees pending payment processing.'),
      carbonOffsetTonnes: z
        .number()
        .optional()
        .describe('Total tonnes of CO₂e avoided (confirmed/paid).'),
      carbonOffsetTonnesPending: z
        .number()
        .optional()
        .describe('Tonnes of CO₂e avoided pending payment processing.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EcologiClient();
    let { username, metric } = ctx.input;

    let output: {
      trees?: number;
      treesPending?: number;
      carbonOffsetTonnes?: number;
      carbonOffsetTonnesPending?: number;
    } = {};

    if (metric === 'trees') {
      let result = await client.getTrees(username);
      output.trees = result.total;
      output.treesPending = result.pending;
    } else if (metric === 'carbon_offset') {
      let result = await client.getCarbonOffset(username);
      output.carbonOffsetTonnes = result.total;
      output.carbonOffsetTonnesPending = result.pending;
    } else {
      let result = await client.getImpact(username);
      output.trees = result.trees;
      output.carbonOffsetTonnes = result.carbonOffset;
    }

    let parts: string[] = [];
    if (output.trees !== undefined) {
      parts.push(`**${output.trees}** trees planted`);
    }
    if (output.carbonOffsetTonnes !== undefined) {
      parts.push(`**${output.carbonOffsetTonnes}** tonnes CO₂e avoided`);
    }

    let summary = parts.length > 0 ? parts.join(' and ') : 'No data available';

    return {
      output,
      message: `Impact for **${username}**: ${summary}.`
    };
  })
  .build();
