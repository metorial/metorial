import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let phantomExecutionCompleted = SlateTrigger.create(spec, {
  name: 'Phantom Execution Completed',
  key: 'phantom_execution_completed',
  description:
    "Triggers when a Phantom finishes executing. Configure the webhook URL in the Phantom's Advanced Notification Settings on the PhantomBuster dashboard."
})
  .input(
    z.object({
      phantomId: z.string().describe('ID of the Phantom that completed'),
      phantomName: z.string().describe('Name of the Phantom'),
      containerId: z.string().describe('ID of the container/execution'),
      exitCode: z.number().optional().describe('Exit code of the execution'),
      exitMessage: z.string().optional().describe('Exit message from the execution'),
      scriptName: z.string().optional().describe('Name of the script that was run'),
      launchDuration: z
        .number()
        .optional()
        .describe('Duration of the launch phase in milliseconds'),
      runDuration: z.number().optional().describe('Duration of the run phase in milliseconds'),
      resultObject: z.any().optional().describe('Result object returned by the Phantom')
    })
  )
  .output(
    z.object({
      phantomId: z.string().describe('ID of the Phantom that completed'),
      phantomName: z.string().describe('Name of the Phantom'),
      containerId: z.string().describe('ID of the container/execution'),
      exitCode: z.number().optional().describe('Exit code of the execution'),
      exitMessage: z.string().optional().describe('Exit message from the execution'),
      scriptName: z.string().optional().describe('Name of the script that was run'),
      launchDuration: z
        .number()
        .optional()
        .describe('Duration of the launch phase in milliseconds'),
      runDuration: z.number().optional().describe('Duration of the run phase in milliseconds'),
      resultObject: z.any().optional().describe('Result object returned by the Phantom')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let phantomId = String(data.agentId ?? data.agent_id ?? data.id ?? '');
      let phantomName = String(data.agentName ?? data.agent_name ?? data.name ?? '');
      let containerId = String(data.containerId ?? data.container_id ?? '');

      return {
        inputs: [
          {
            phantomId,
            phantomName,
            containerId,
            exitCode: data.exitCode ?? data.exit_code ?? undefined,
            exitMessage: data.exitMessage ?? data.exit_message ?? undefined,
            scriptName: data.scriptName ?? data.script_name ?? undefined,
            launchDuration: data.launchDuration ?? data.launch_duration ?? undefined,
            runDuration: data.runDuration ?? data.run_duration ?? undefined,
            resultObject: data.resultObject ?? data.result_object ?? undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let succeeded = ctx.input.exitCode === 0 || ctx.input.exitCode === undefined;
      let eventType = succeeded ? 'phantom.execution_succeeded' : 'phantom.execution_failed';

      return {
        type: eventType,
        id: ctx.input.containerId || `${ctx.input.phantomId}-${Date.now()}`,
        output: {
          phantomId: ctx.input.phantomId,
          phantomName: ctx.input.phantomName,
          containerId: ctx.input.containerId,
          exitCode: ctx.input.exitCode,
          exitMessage: ctx.input.exitMessage,
          scriptName: ctx.input.scriptName,
          launchDuration: ctx.input.launchDuration,
          runDuration: ctx.input.runDuration,
          resultObject: ctx.input.resultObject
        }
      };
    }
  })
  .build();
