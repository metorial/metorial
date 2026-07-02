import { SlateTool } from 'slates';
import { z } from 'zod';
import { ArmClient } from '../lib/client';
import { spec } from '../spec';

export let getFunction = SlateTool.create(spec, {
  name: 'Get Function',
  key: 'get_function',
  description: `Get detailed information about a specific function within a function app, including its invocation URL, language, configuration, and associated files. Optionally retrieves the function's access keys.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appName: z.string().describe('Name of the function app'),
      functionName: z.string().describe('Name of the function'),
      includeKeys: z
        .boolean()
        .default(false)
        .describe('Whether to include function-level access keys')
    })
  )
  .output(
    z.object({
      functionName: z.string().describe('Name of the function'),
      resourceId: z.string().describe('Full ARM resource ID'),
      invokeUrlTemplate: z.string().optional().describe('URL template to invoke the function'),
      language: z.string().optional().describe('Programming language'),
      isDisabled: z.boolean().optional().describe('Whether the function is disabled'),
      scriptHref: z.string().optional().describe('URL to the function script'),
      configHref: z.string().optional().describe('URL to the function configuration'),
      functionConfig: z.any().optional().describe('Function binding/trigger configuration'),
      keys: z
        .record(z.string(), z.string())
        .optional()
        .describe('Function-level access keys (if requested)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ArmClient({
      token: ctx.auth.token,
      subscriptionId: ctx.config.subscriptionId,
      resourceGroupName: ctx.config.resourceGroupName
    });

    ctx.info(`Getting function ${ctx.input.functionName} in app ${ctx.input.appName}`);

    let fn = await client.getFunction(ctx.input.appName, ctx.input.functionName);

    let keys: Record<string, string> | undefined;
    if (ctx.input.includeKeys) {
      try {
        let keysResponse = await client.listFunctionKeys(
          ctx.input.appName,
          ctx.input.functionName
        );
        keys = keysResponse || {};
      } catch (_e) {
        ctx.warn('Could not retrieve function keys');
      }
    }

    let functionName = fn.name?.split('/')?.pop() || fn.name;

    return {
      output: {
        functionName,
        resourceId: fn.id,
        invokeUrlTemplate: fn.properties?.invoke_url_template,
        language: fn.properties?.language,
        isDisabled: fn.properties?.isDisabled,
        scriptHref: fn.properties?.script_href,
        configHref: fn.properties?.config_href,
        functionConfig: fn.properties?.config,
        keys
      },
      message: `Function **${functionName}** in **${ctx.input.appName}**${fn.properties?.isDisabled ? ' (disabled)' : ''}.\n- Language: ${fn.properties?.language || 'unknown'}\n- Invoke URL: \`${fn.properties?.invoke_url_template || 'N/A'}\``
    };
  })
  .build();
