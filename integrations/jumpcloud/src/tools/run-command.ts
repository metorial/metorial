import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      triggerName: z.string().describe('The trigger name configured on the command'),
      environmentVars: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value pairs passed as environment variables to the command')
    })
  )
  .output(
    z.object({
      triggered: z.boolean().describe('Whether the command was triggered successfully'),
      triggerName: z.string().describe('Trigger name used')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    await client.runCommandByTrigger(ctx.input.triggerName, ctx.input.environmentVars);

    return {
      output: {
        triggered: true,
        triggerName: ctx.input.triggerName
      },
      message: `Triggered command via trigger **${ctx.input.triggerName}**. Command is executing on target systems.`
    };
  })
  .build();
