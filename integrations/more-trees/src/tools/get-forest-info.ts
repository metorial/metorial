import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getForestInfo = SlateTool.create(spec, {
  name: 'Get Forest Info',
  key: 'get_forest_info',
  description: `Retrieve forest data including branding and plantation statistics. Returns the forest name, logo, brand color, and aggregate totals such as trees planted, trees gifted, trees received, CO2 captured, and number of projects supported. Can look up by forest slug or defaults to the configured account code.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      forestSlug: z
        .string()
        .optional()
        .describe(
          'Forest slug to look up. If omitted, uses your account code from configuration.'
        )
    })
  )
  .output(
    z.object({
      forestName: z.string().describe('Name of the forest'),
      logoUrl: z.string().describe('URL of the forest logo'),
      brandColor: z.string().describe('Brand color hex code'),
      totals: z
        .object({
          treesPlanted: z.number().describe('Total trees planted'),
          treesGifted: z.number().describe('Total trees gifted to others'),
          treesReceived: z.number().describe('Total trees received from others'),
          co2Captured: z.number().describe('Total CO2 captured in kg'),
          projectsSupported: z.number().describe('Number of projects supported')
        })
        .describe('Aggregate plantation statistics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      publicValidationKey: ctx.auth.publicValidationKey
    });

    let lookup = ctx.input.forestSlug || ctx.config.accountCode;
    let forest = await client.getForestInfo(lookup);

    return {
      output: forest,
      message: `Forest **${forest.forestName}**: **${forest.totals.treesPlanted}** trees planted, **${forest.totals.co2Captured}** CO2 captured, **${forest.totals.projectsSupported}** projects supported.`
    };
  })
  .build();
