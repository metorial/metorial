import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let triggerCommand = SlateTool.create(spec, {
  name: 'Trigger Command',
  key: 'trigger_command',
  description: `Request execution of a command on one of your registered TRIGGERcmd computers. Use list_computers and list_commands to find the computer name and trigger name. Optionally pass parameters if the command has parameter support enabled. Acceptance does not confirm that the computer finished executing the command; use command_run_history to inspect subsequent status.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      computer: z.string().describe('Computer name from list_computers or list_commands'),
      trigger: z.string().describe('Trigger name from list_commands'),
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

    return {
      output: {
        result
      },
      message: `Requested command **${ctx.input.trigger}** on computer **${ctx.input.computer}**. Check command_run_history for execution status.`
    };
  })
  .build();
