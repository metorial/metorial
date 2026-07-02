import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZeplinClient } from '../lib/client';
import { spec } from '../spec';

export let listSpacingTokens = SlateTool.create(spec, {
  name: 'List Spacing Tokens',
  key: 'list_spacing_tokens',
  description: `List all spacing tokens from a Zeplin project or styleguide. Provide either a **projectId** or **styleguideId**. Returns spacing definitions used in the design system.`,
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
        .describe('ID of the styleguide (provide this or projectId)'),
      limit: z.number().min(1).max(100).optional().describe('Number of results per page'),
      offset: z.number().min(0).optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      spacingTokens: z.array(z.any()).describe('List of spacing token definitions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZeplinClient(ctx.auth.token);
    let spacingTokens: any[];

    if (ctx.input.projectId) {
      spacingTokens = (await client.listProjectSpacingTokens(ctx.input.projectId, {
        limit: ctx.input.limit,
        offset: ctx.input.offset
      })) as any[];
    } else if (ctx.input.styleguideId) {
      spacingTokens = (await client.listStyleguideSpacingTokens(ctx.input.styleguideId, {
        limit: ctx.input.limit,
        offset: ctx.input.offset
      })) as any[];
    } else {
      throw new Error('Either projectId or styleguideId must be provided');
    }

    return {
      output: { spacingTokens },
      message: `Found **${spacingTokens.length}** spacing token(s).`
    };
  })
  .build();
