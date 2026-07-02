import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZeplinClient } from '../lib/client';
import { spec } from '../spec';

export let listTextStyles = SlateTool.create(spec, {
  name: 'List Text Styles',
  key: 'list_text_styles',
  description: `List all text styles from a Zeplin project or styleguide. Provide either a **projectId** or **styleguideId**. Returns typography definitions including font family, size, weight, and other properties.`,
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
      textStyles: z.array(z.any()).describe('List of text style definitions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZeplinClient(ctx.auth.token);
    let textStyles: any[];

    if (ctx.input.projectId) {
      textStyles = (await client.listProjectTextStyles(ctx.input.projectId, {
        limit: ctx.input.limit,
        offset: ctx.input.offset
      })) as any[];
    } else if (ctx.input.styleguideId) {
      textStyles = (await client.listStyleguideTextStyles(ctx.input.styleguideId, {
        limit: ctx.input.limit,
        offset: ctx.input.offset
      })) as any[];
    } else {
      throw new Error('Either projectId or styleguideId must be provided');
    }

    return {
      output: { textStyles },
      message: `Found **${textStyles.length}** text style(s).`
    };
  })
  .build();
