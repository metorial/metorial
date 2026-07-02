import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTemplateElements = SlateTool.create(spec, {
  name: 'Get Template Elements',
  key: 'get_template_elements',
  description: `Inspect the elements of a design template to understand its structure before generating images. Returns element names and their properties. Use the **basic** detail level for a simplified view of element names and key properties, or **full** for complete element data including dimensions, colors, fonts, positioning, and opacity.`,
  instructions: [
    'Use this tool to discover which elements in a template can be customized when generating images.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('The ID of the design template to inspect'),
      detailLevel: z
        .enum(['full', 'basic'])
        .optional()
        .default('basic')
        .describe(
          'Level of detail for element properties. "basic" returns simplified names and key properties; "full" returns all properties.'
        )
    })
  )
  .output(
    z.object({
      elements: z
        .record(z.string(), z.any())
        .describe('Map of element names to their properties')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result =
      ctx.input.detailLevel === 'basic'
        ? await client.getTemplateElementsBasic(ctx.input.templateId)
        : await client.getTemplateElements(ctx.input.templateId);

    return {
      output: {
        elements: result
      },
      message: `Retrieved **${ctx.input.detailLevel}** element details for template \`${ctx.input.templateId}\`.`
    };
  })
  .build();
