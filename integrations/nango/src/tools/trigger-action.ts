import { SlateTool } from 'slates';
import { z } from 'zod';
import { NangoClient } from '../lib/client';
import { spec } from '../spec';

export let triggerAction = SlateTool.create(spec, {
  name: 'Trigger Action',
  key: 'trigger_action',
  description: `Execute an on-demand action function against an external API through Nango. Actions are one-off operations like creating a record or sending a message, defined as TypeScript functions deployed to Nango. The action runs with the credentials of the specified connection.`
})
  .input(
    z.object({
      connectionId: z.string().describe('The connection ID to execute the action for'),
      providerConfigKey: z.string().describe('The integration ID (unique key)'),
      actionName: z.string().describe('Name of the action to execute'),
      actionInput: z
        .record(z.string(), z.any())
        .optional()
        .describe('Input parameters for the action')
    })
  )
  .output(
    z.object({
      actionResult: z.any().describe('The result returned by the action function')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NangoClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.triggerAction({
      connectionId: ctx.input.connectionId,
      providerConfigKey: ctx.input.providerConfigKey,
      actionName: ctx.input.actionName,
      input: ctx.input.actionInput
    });

    return {
      output: { actionResult: result },
      message: `Executed action **${ctx.input.actionName}** on connection **${ctx.input.connectionId}**.`
    };
  })
  .build();
