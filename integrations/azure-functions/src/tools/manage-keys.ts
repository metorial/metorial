import { SlateTool } from 'slates';
import { z } from 'zod';
import { ArmClient } from '../lib/client';
import { azureFunctionsServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageKeys = SlateTool.create(spec, {
  name: 'Manage Access Keys',
  key: 'manage_keys',
  description: `Manage function-level and host-level access keys for Azure Function Apps. Supports listing, creating, updating, and deleting keys. Function keys control access to individual functions, while host keys control access to all functions in the app.`,
  instructions: [
    'Use scope "function" to manage keys for a specific function (requires functionName).',
    'Use scope "host" to manage host-level keys that apply to all functions in the app.',
    'When creating a key without specifying a value, Azure generates one automatically.'
  ]
})
  .input(
    z.object({
      appName: z.string().describe('Name of the function app'),
      scope: z
        .enum(['function', 'host'])
        .describe('Whether to manage function-level or host-level keys'),
      action: z.enum(['list', 'create', 'delete']).describe('Action to perform'),
      functionName: z
        .string()
        .optional()
        .describe('Function name (required when scope is "function")'),
      keyName: z
        .string()
        .optional()
        .describe('Name of the key (required for create and delete actions)'),
      keyValue: z
        .string()
        .optional()
        .describe('Value for the key (optional for create — Azure generates one if omitted)')
    })
  )
  .output(
    z.object({
      keys: z
        .record(z.string(), z.string())
        .optional()
        .describe('Map of key names to values (for list action)'),
      keyName: z.string().optional().describe('Name of the created or deleted key'),
      keyValue: z.string().optional().describe('Value of the created key'),
      action: z.string().describe('Action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ArmClient({
      token: ctx.auth.token,
      subscriptionId: ctx.config.subscriptionId,
      resourceGroupName: ctx.config.resourceGroupName
    });

    let { appName, scope, action, functionName, keyName, keyValue } = ctx.input;

    if (scope === 'function' && !functionName) {
      throw azureFunctionsServiceError('functionName is required when scope is "function"');
    }
    if ((action === 'create' || action === 'delete') && !keyName) {
      throw azureFunctionsServiceError('keyName is required for create and delete actions');
    }

    ctx.info(
      `${action} ${scope} key(s) for ${appName}${functionName ? `/${functionName}` : ''}`
    );

    if (action === 'list') {
      let keysResult: any;
      if (scope === 'function') {
        keysResult = await client.listFunctionKeys(appName, functionName!);
      } else {
        keysResult = await client.listHostKeys(appName);
      }

      let keys = keysResult.functionKeys || keysResult || {};

      return {
        output: { keys, action },
        message: `Listed **${Object.keys(keys).length}** ${scope} key(s) for **${appName}**${functionName ? `/${functionName}` : ''}.`
      };
    }

    if (action === 'create') {
      let result: any;
      if (scope === 'function') {
        result = await client.createOrUpdateFunctionKey(
          appName,
          functionName!,
          keyName!,
          keyValue
        );
      } else {
        result = await client.createOrUpdateHostKey(appName, keyName!, keyValue);
      }

      return {
        output: {
          keyName: keyName!,
          keyValue: result.properties?.value || result.value,
          action
        },
        message: `Created/updated ${scope} key **${keyName}** for **${appName}**${functionName ? `/${functionName}` : ''}.`
      };
    }

    // delete
    if (scope === 'function') {
      await client.deleteFunctionKey(appName, functionName!, keyName!);
    } else {
      await client.deleteHostKey(appName, keyName!);
    }

    return {
      output: { keyName: keyName!, action },
      message: `Deleted ${scope} key **${keyName}** from **${appName}**${functionName ? `/${functionName}` : ''}.`
    };
  })
  .build();
