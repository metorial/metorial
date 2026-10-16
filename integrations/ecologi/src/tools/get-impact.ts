import { SlateTool } from 'slates';
import { z } from 'zod';
import { EcologiClient } from '../lib/client';
import { spec } from '../spec';

export let getImpactTool = SlateTool.create(spec, {
  name: 'Get Impact',
  key: 'get_impact',
  description:
    'Retrieve public Ecologi impact totals and pending amounts for a username. Includes trees, carbon avoidance, carbon removal, and habitat restoration. No API key is required.',
  instructions: ['Data refreshes every 10 minutes; recent purchases may not be reflected.'],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      username: z.string().trim().describe('Ecologi profile username.'),
      metric: z
        .enum(['all', 'trees', 'carbon_offset', 'carbon_removal', 'habitat_restoration'])
        .default('all')
        .describe('Retrieve combined impact or a single metric.')
    })
  )
  .output(
    z.object({
      trees: z.number().optional().describe('Total trees funded.'),
      treesPending: z.number().optional().describe('Trees pending payment.'),
      carbonOffsetTonnes: z.number().optional().describe('Total tonnes of CO₂e avoided.'),
      carbonOffsetTonnesPending: z
        .number()
        .optional()
        .describe('Tonnes of avoidance pending payment.'),
      carbonRemovalTonnes: z.number().optional().describe('Total tonnes of CO₂e removed.'),
      carbonRemovalTonnesPending: z
        .number()
        .optional()
        .describe('Tonnes of removal pending payment.'),
      habitatRestorationSquareMetres: z
        .number()
        .optional()
        .describe('Total square metres of habitat restored.'),
      habitatRestorationSquareMetresPending: z
        .number()
        .optional()
        .describe('Square metres of habitat restoration pending payment.'),
      raw: z.record(z.string(), z.unknown()).describe('The complete response from Ecologi.')
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
      carbonRemovalTonnes?: number;
      carbonRemovalTonnesPending?: number;
      habitatRestorationSquareMetres?: number;
      habitatRestorationSquareMetresPending?: number;
      raw: Record<string, unknown>;
    };

    if (metric === 'all') {
      let result = await client.getImpact(username);
      output = {
        trees: result.trees,
        treesPending: result.pending?.trees,
        carbonOffsetTonnes: result.carbonOffset,
        carbonOffsetTonnesPending: result.pending?.carbonOffset,
        carbonRemovalTonnes: result.carbonRemoval,
        carbonRemovalTonnesPending: result.pending?.carbonRemoval,
        habitatRestorationSquareMetres: result.habitatRestoration,
        habitatRestorationSquareMetresPending: result.pending?.habitatRestoration,
        raw: result
      };
    } else {
      let paths = {
        trees: 'trees',
        carbon_offset: 'carbon-offset',
        carbon_removal: 'carbon-removal',
        habitat_restoration: 'habitat-restoration'
      } as const;
      let result = await client.getMetric(username, paths[metric]);
      output = { raw: result };
      if (metric === 'trees') {
        output.trees = result.total;
        output.treesPending = result.pending;
      } else if (metric === 'carbon_offset') {
        output.carbonOffsetTonnes = result.total;
        output.carbonOffsetTonnesPending = result.pending;
      } else if (metric === 'carbon_removal') {
        output.carbonRemovalTonnes = result.total;
        output.carbonRemovalTonnesPending = result.pending;
      } else {
        output.habitatRestorationSquareMetres = result.total;
        output.habitatRestorationSquareMetresPending = result.pending;
      }
    }

    return { output, message: `Retrieved ${metric} impact for **${username}**.` };
  })
  .build();
