import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { orgIdInput, upstream } from '../lib/validation';
import { spec } from '../spec';

export let runCommand = SlateTool.create(spec, {
  name: 'Run Command via Trigger',
  key: 'run_command',
  description: `Execute a JumpCloud command via its webhook trigger name. The command must have been previously created with launchType "trigger" and a trigger name configured. Optionally pass environment variables as key-value pairs that will be available to the command script.`,
  instructions: [
    'The command must already exist and have a trigger name configured.',
    'Top-level string/numeric properties in environmentVars are passed as environment variables to the command script.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      orgId: orgIdInput,
      triggerName: z.string().describe('The trigger name configured on the command'),
      environmentVars: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value pairs passed as environment variables to the command')
    })
  )
  .output(
    z.object({
      triggered: z
        .boolean()
        .describe(
          'Native triggered flag; acceptance does not confirm execution or completion'
        ),
      triggerName: z.string().describe('Trigger name used')
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);
    try {
      const result = await client.runCommandByTrigger(
        ctx.input.triggerName,
        ctx.input.environmentVars
      );

      return {
        output: {
          triggered: result.triggered,
          triggerName: ctx.input.triggerName
        },
        message: `Triggered command via trigger **${ctx.input.triggerName}**. Native triggered flag: **${result.triggered}**. This can target multiple matching commands; inspect results before any retry.`
      };
    } catch (error) {
      throw upstream(error, client.didWrite);
    }
  })
  .build();
