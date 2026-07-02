import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let triggerCommand = SlateTool.create(spec, {
  name: 'Trigger Command',
  key: 'trigger_command',
  description: `Remotely execute a command on one of your registered TRIGGERcmd computers. Specify the computer name and trigger name to run the command. Optionally pass parameters to the command if the command has parameter support enabled.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      computer: z.string().describe('Name of the computer to run the command on'),
      trigger: z.string().describe('Name of the command/trigger to execute'),
      params: z
        .string()
        .optional()
        .describe(
          'Optional parameters to pass to the command. The command must have "Allow Parameters" enabled.'
        )
    })
  )
  .output(
    z.object({
      result: z.any().describe('Response from the TRIGGERcmd API after triggering the command')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.triggerCommand({
      computer: ctx.input.computer,
      trigger: ctx.input.trigger,
      params: ctx.input.params
    });

    let paramsInfo = ctx.input.params ? ` with params "${ctx.input.params}"` : '';

    return {
      output: {
        result
      },
      message: `Triggered command **${ctx.input.trigger}** on computer **${ctx.input.computer}**${paramsInfo}.`
    };
  })
  .build();
