import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageFlow = SlateTool.create(spec, {
  name: 'Manage Flow',
  key: 'manage_flow',
  description: `Create, update, enable, disable, run, clone, or delete a flow. Use the **action** field to specify the operation.
For "create" and "update", provide the flow configuration in **flowData**. For "enable", "disable", "run", "clone", and "delete", only the **flowId** is needed.`,
  instructions: [
    'Running a flow via API places it in the invocation queue — it does not guarantee immediate execution.',
    'Cloning a flow creates a full duplicate including its exports and imports.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'enable', 'disable', 'run', 'clone', 'delete'])
        .describe('The operation to perform on the flow'),
      flowId: z
        .string()
        .optional()
        .describe('ID of the flow (required for all actions except "create")'),
      flowData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Flow configuration data (required for "create" and "update")')
    })
  )
  .output(
    z.object({
      flowId: z.string().optional().describe('ID of the affected flow'),
      name: z.string().optional().describe('Name of the flow'),
      disabled: z.boolean().optional().describe('Whether the flow is disabled'),
      deleted: z.boolean().optional().describe('Whether the flow was deleted'),
      rawResult: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let { action, flowId, flowData } = ctx.input;

    if (action !== 'create' && !flowId) {
      throw new Error('flowId is required for this action');
    }

    let result: any;
    let message: string;

    switch (action) {
      case 'create': {
        if (!flowData) throw new Error('flowData is required for create');
        result = await client.createFlow(flowData);
        message = `Created flow **${result.name || result._id}**.`;
        break;
      }
      case 'update': {
        if (!flowData) throw new Error('flowData is required for update');
        result = await client.updateFlow(flowId!, flowData);
        message = `Updated flow **${result.name || result._id}**.`;
        break;
      }
      case 'enable': {
        result = await client.enableFlow(flowId!);
        message = `Enabled flow **${result.name || flowId}**.`;
        break;
      }
      case 'disable': {
        result = await client.disableFlow(flowId!);
        message = `Disabled flow **${result.name || flowId}**.`;
        break;
      }
      case 'run': {
        result = await client.runFlow(flowId!);
        message = `Triggered run for flow **${flowId}**. The flow has been added to the invocation queue.`;
        break;
      }
      case 'clone': {
        result = await client.cloneFlow(flowId!);
        message = `Cloned flow **${flowId}** → new flow **${result._id}**.`;
        break;
      }
      case 'delete': {
        await client.deleteFlow(flowId!);
        return {
          output: {
            flowId: flowId!,
            deleted: true
          },
          message: `Deleted flow **${flowId}**.`
        };
      }
    }

    return {
      output: {
        flowId: result?._id || flowId,
        name: result?.name,
        disabled: result?.disabled,
        rawResult: result
      },
      message
    };
  })
  .build();
