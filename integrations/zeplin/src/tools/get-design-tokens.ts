import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZeplinClient } from '../lib/client';
import { spec } from '../spec';

export let getDesignTokens = SlateTool.create(spec, {
  name: 'Get Design Tokens',
  key: 'get_design_tokens',
  description: `Retrieve all exported design tokens from a Zeplin project or styleguide, including colors, text styles, and spacing tokens in a structured format. Provide either a **projectId** or **styleguideId**.`,
  instructions: ['Provide either projectId or styleguideId, not both.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('ID of the project (provide this or styleguideId)'),
      styleguideId: z
        .string()
        .optional()
        .describe('ID of the styleguide (provide this or projectId)')
    })
  )
  .output(
    z.object({
      designTokens: z
        .any()
        .describe(
          'Structured design token data including colors, text styles, and spacing tokens'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZeplinClient(ctx.auth.token);
    let tokens: any;

    if (ctx.input.projectId) {
      tokens = await client.getProjectDesignTokens(ctx.input.projectId);
    } else if (ctx.input.styleguideId) {
      tokens = await client.getStyleguideDesignTokens(ctx.input.styleguideId);
    } else {
      throw new Error('Either projectId or styleguideId must be provided');
    }

    return {
      output: { designTokens: tokens },
      message: `Retrieved design tokens.`
    };
  })
  .build();
