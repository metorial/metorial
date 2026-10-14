import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { findAllSchemaOutput } from '../lib/schemas';
import { spec } from '../spec';

export let getFindallSchema = SlateTool.create(spec, {
  name: 'Get FindAll Run Schema',
  key: 'get_findall_schema',
  description:
    'Retrieve the objective, conditions, current match limit, generator, and configured enrichments of an existing FindAll run. Use this before extending a run or interpreting its candidate fields.',
  tags: { readOnly: true }
})
  .input(
    z.object({ findallId: z.string().describe('FindAll run ID returned by Find Entities') })
  )
  .output(findAllSchemaOutput)
  .handleInvocation(async ctx => {
    let schema = await new Client(ctx.auth.token).getFindAllSchema(ctx.input.findallId);
    return {
      output: { findallId: ctx.input.findallId, ...schema },
      message: `Retrieved the schema for FindAll run **${ctx.input.findallId}**.`
    };
  })
  .build();
