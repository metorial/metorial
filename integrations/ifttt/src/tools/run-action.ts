import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnectClient } from '../lib/client';
import { spec } from '../spec';

export let runActionTool = SlateTool.create(spec, {
  name: 'Run Action',
  key: 'run_action',
  description: `Execute an action on a connected IFTTT service for a specific user. Actions are the output side of Applets, such as creating calendar events, sending messages, controlling smart home devices, posting to social media, etc. The available action fields depend on the connected service's action definition.`,
  instructions: [
    'The user must have the connection enabled for this to succeed.',
    'Action fields vary by service — use Get Connection to discover available actions and their field requirements.'
  ]
})
  .input(
    z.object({
      connectionId: z.string().describe('The ID of the connection containing the action'),
      actionId: z
        .string()
        .describe('The action identifier (e.g., "google_calendar.create_event")'),
      userId: z.string().describe('The user ID to run the action for'),
      fields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Action field values specific to the action being run'),
      userFeatureId: z
        .string()
        .optional()
        .describe('Optional user feature ID to scope the action')
    })
  )
  .output(
    z.object({
      connectionId: z.string().describe('The connection ID'),
      actionId: z.string().describe('The action that was executed'),
      result: z.any().optional().describe('The action execution result, if any')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConnectClient(ctx.auth.token);
    let result = await client.runAction(
      ctx.input.connectionId,
      ctx.input.actionId,
      ctx.input.userId,
      ctx.input.fields,
      ctx.input.userFeatureId
    );

    return {
      output: {
        connectionId: ctx.input.connectionId,
        actionId: ctx.input.actionId,
        result
      },
      message: `Executed action **${ctx.input.actionId}** on connection **${ctx.input.connectionId}** for user **${ctx.input.userId}**.`
    };
  })
  .build();
