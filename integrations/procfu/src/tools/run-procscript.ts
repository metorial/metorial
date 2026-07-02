import { SlateTool } from 'slates';
import { z } from 'zod';
import { ProcFuClient } from '../lib/client';
import { spec } from '../spec';

export let runProcScript = SlateTool.create(spec, {
  name: 'Run ProcScript',
  key: 'run_procscript',
  description: `Execute a ProcScript by name. ProcScripts are custom scripts written in the ProcFu editor.
Pass an optional JSON payload that becomes available in the script as the \`payload\` variable.
Can run synchronously (waits for result) or in the background (fire-and-forget).`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      scriptName: z
        .string()
        .describe('The filename of the ProcScript to execute (as shown in ProcFu editor)'),
      payload: z
        .record(z.string(), z.any())
        .optional()
        .describe('Optional JSON object to pass to the script as the payload variable'),
      runInBackground: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, executes the script in the background without waiting for results')
    })
  )
  .output(
    z.object({
      result: z.any().describe('The script execution result (null if run in background)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ProcFuClient({ token: ctx.auth.token });

    let payloadStr = ctx.input.payload ? JSON.stringify(ctx.input.payload) : undefined;

    let result = ctx.input.runInBackground
      ? await client.callProcScriptBackground(ctx.input.scriptName, payloadStr)
      : await client.callProcScript(ctx.input.scriptName, payloadStr);

    return {
      output: { result },
      message: ctx.input.runInBackground
        ? `Launched ProcScript **${ctx.input.scriptName}** in the background.`
        : `Executed ProcScript **${ctx.input.scriptName}** successfully.`
    };
  })
  .build();
