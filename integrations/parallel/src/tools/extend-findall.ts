import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { findAllSchemaOutput } from '../lib/schemas';
import { spec } from '../spec';

export let extendFindall = SlateTool.create(spec, {
  name: 'Extend FindAll Run',
  key: 'extend_findall',
  description:
    'Increase an existing FindAll run match limit to discover more entities using the same criteria and enrichments. The additional limit is an increment, rather than a replacement total.',
  constraints: [
    'Preview runs cannot be extended. The resulting total limit cannot exceed 1000.',
    'A completed run can resume only when it stopped because its match limit was met. Additional matches and enrichments incur costs.'
  ],
  tags: { readOnly: false }
})
  .input(
    z.object({
      findallId: z.string().describe('FindAll run ID returned by Find Entities'),
      additionalMatchLimit: z
        .number()
        .int()
        .positive()
        .describe('Additional matches to request; add this value to the current total limit')
    })
  )
  .output(findAllSchemaOutput)
  .handleInvocation(async ctx => {
    let schema = await new Client(ctx.auth.token).extendFindAll(
      ctx.input.findallId,
      ctx.input.additionalMatchLimit
    );
    return {
      output: { findallId: ctx.input.findallId, ...schema },
      message: `Extended FindAll run **${ctx.input.findallId}**${schema.matchLimit === null ? '.' : ` to a total match limit of **${schema.matchLimit}**.`}`
    };
  })
  .build();
