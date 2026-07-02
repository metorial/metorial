import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteFunction = SlateTool.create(spec, {
  name: 'Delete Function',
  key: 'delete_function',
  description: `Delete a Lambda function. Optionally specify a **qualifier** to delete only a specific version (not \`$LATEST\`). Without a qualifier, the entire function including all versions and aliases is deleted.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      functionName: z.string().describe('Function name or ARN'),
      qualifier: z
        .string()
        .optional()
        .describe('Version number to delete (cannot delete $LATEST)')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.deleteFunction(ctx.input.functionName, ctx.input.qualifier);

    let msg = ctx.input.qualifier
      ? `Deleted version **${ctx.input.qualifier}** of function **${ctx.input.functionName}**.`
      : `Deleted function **${ctx.input.functionName}** and all its versions/aliases.`;

    return {
      output: { deleted: true },
      message: msg
    };
  })
  .build();
