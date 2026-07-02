import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let savePhantom = SlateTool.create(spec, {
  name: 'Save Phantom',
  key: 'save_phantom',
  description: `Create a new Phantom or update an existing one. To update an existing Phantom, provide the \`phantomId\`. To create a new one, omit the ID and provide a \`name\` and \`scriptId\`.`
})
  .input(
    z.object({
      phantomId: z
        .string()
        .optional()
        .describe('ID of an existing Phantom to update. Omit to create a new one.'),
      name: z.string().optional().describe('Name for the Phantom'),
      scriptId: z
        .string()
        .optional()
        .describe('ID of the script to associate with the Phantom'),
      argument: z
        .record(z.string(), z.any())
        .optional()
        .describe('Default argument/configuration for the Phantom'),
      launchType: z
        .string()
        .optional()
        .describe('Launch type (e.g., "manually", "repeatedly")'),
      executionTimeLimit: z.number().optional().describe('Maximum execution time in seconds'),
      notifications: z
        .record(z.string(), z.any())
        .optional()
        .describe('Notification settings including webhook URL')
    })
  )
  .output(
    z.object({
      phantomId: z.string().describe('ID of the created or updated Phantom'),
      name: z.string().optional().describe('Name of the Phantom')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {};
    if (ctx.input.phantomId) body.id = ctx.input.phantomId;
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.scriptId) body.scriptId = ctx.input.scriptId;
    if (ctx.input.argument) body.argument = ctx.input.argument;
    if (ctx.input.launchType) body.launchType = ctx.input.launchType;
    if (ctx.input.executionTimeLimit !== undefined)
      body.executionTimeLimit = ctx.input.executionTimeLimit;
    if (ctx.input.notifications) body.notifications = ctx.input.notifications;

    let result = await client.saveAgent(body);

    let isUpdate = !!ctx.input.phantomId;
    let phantomId = String(result?.id ?? ctx.input.phantomId ?? '');

    return {
      output: {
        phantomId,
        name: result?.name ?? ctx.input.name
      },
      message: isUpdate
        ? `Updated Phantom **${phantomId}**.`
        : `Created new Phantom **${phantomId}**.`
    };
  })
  .build();
