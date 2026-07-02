import { SlateTool } from 'slates';
import { z } from 'zod';
import { ArmClient } from '../lib/client';
import { spec } from '../spec';

export let manageFunctionApp = SlateTool.create(spec, {
  name: 'Manage Function App',
  key: 'manage_function_app',
  description: `Perform lifecycle operations on an Azure Function App. Supports starting, stopping, restarting, and deleting function apps. Use this to control the running state of your function apps.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      appName: z.string().describe('Name of the function app'),
      action: z
        .enum(['start', 'stop', 'restart', 'delete'])
        .describe('Action to perform on the function app')
    })
  )
  .output(
    z.object({
      appName: z.string().describe('Name of the function app'),
      action: z.string().describe('Action that was performed'),
      success: z.boolean().describe('Whether the action completed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ArmClient({
      token: ctx.auth.token,
      subscriptionId: ctx.config.subscriptionId,
      resourceGroupName: ctx.config.resourceGroupName
    });

    let { appName, action } = ctx.input;
    ctx.info(`Performing ${action} on function app: ${appName}`);

    switch (action) {
      case 'start':
        await client.startFunctionApp(appName);
        break;
      case 'stop':
        await client.stopFunctionApp(appName);
        break;
      case 'restart':
        await client.restartFunctionApp(appName);
        break;
      case 'delete':
        await client.deleteFunctionApp(appName);
        break;
    }

    return {
      output: {
        appName,
        action,
        success: true
      },
      message: `Successfully performed **${action}** on function app **${appName}**.`
    };
  })
  .build();
