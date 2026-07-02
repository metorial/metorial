import { SlateTool } from 'slates';
import { z } from 'zod';
import { StormboardClient } from '../lib/client';
import { spec } from '../spec';

export let updateStormSection = SlateTool.create(spec, {
  name: 'Update Storm Section',
  key: 'update_storm_section',
  description: `Update a section's title, description, or character identifier within a Storm. Can also update the Storm's color legend labels.`,
  instructions: [
    'Use "section" mode to update a section within the Storm template.',
    'Use "legend" mode to update the color legend labels of a Storm.'
  ]
})
  .input(
    z.object({
      stormId: z.string().describe('ID of the Storm'),
      mode: z
        .enum(['section', 'legend'])
        .describe('Whether to update a section or the legend'),
      sectionChar: z
        .string()
        .optional()
        .describe('Section character identifier (required for section mode)'),
      title: z.string().optional().describe('New section title (for section mode)'),
      description: z
        .string()
        .optional()
        .describe('New section description (for section mode)'),
      newChar: z
        .string()
        .optional()
        .describe('New character identifier for the section (for section mode)'),
      legendColour: z.string().optional().describe('Legend color to update (for legend mode)'),
      legendName: z
        .string()
        .optional()
        .describe('New label name for the legend color (for legend mode)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful'),
      result: z.any().optional().describe('Updated resource data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StormboardClient({ token: ctx.auth.token });
    let { stormId, mode, sectionChar, title, description, newChar, legendColour, legendName } =
      ctx.input;

    if (mode === 'section') {
      if (!sectionChar) {
        throw new Error('sectionChar is required for updating a section');
      }
      let result = await client.updateSection(stormId, sectionChar, {
        title,
        description,
        char: newChar
      });
      return {
        output: { success: true, result },
        message: `Updated section **"${sectionChar}"** in Storm ${stormId}.`
      };
    }

    if (mode === 'legend') {
      if (!legendColour || !legendName) {
        throw new Error('legendColour and legendName are required for updating the legend');
      }
      let result = await client.updateLegend(stormId, {
        colour: legendColour,
        name: legendName
      });
      return {
        output: { success: true, result },
        message: `Updated legend color **"${legendColour}"** to **"${legendName}"** in Storm ${stormId}.`
      };
    }

    return {
      output: { success: false },
      message: 'Unknown mode.'
    };
  })
  .build();
