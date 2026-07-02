import { SlateTool } from 'slates';
import { z } from 'zod';
import { ArmClient } from '../lib/client';
import { spec } from '../spec';

let functionSummarySchema = z.object({
  functionName: z.string().describe('Name of the function'),
  resourceId: z.string().describe('Full ARM resource ID of the function'),
  invokeUrlTemplate: z.string().optional().describe('URL template to invoke the function'),
  language: z.string().optional().describe('Programming language of the function'),
  isDisabled: z.boolean().optional().describe('Whether the function is currently disabled'),
  configHref: z.string().optional().describe('URL to the function configuration')
});

export let listFunctions = SlateTool.create(spec, {
  name: 'List Functions',
  key: 'list_functions',
  description: `List all individual functions within a specific Azure Function App. Returns each function's name, invoke URL, language, and enabled/disabled status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appName: z.string().describe('Name of the function app containing the functions')
    })
  )
  .output(
    z.object({
      functions: z.array(functionSummarySchema).describe('List of functions in the app'),
      count: z.number().describe('Total number of functions found')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ArmClient({
      token: ctx.auth.token,
      subscriptionId: ctx.config.subscriptionId,
      resourceGroupName: ctx.config.resourceGroupName
    });

    ctx.info(`Listing functions in app: ${ctx.input.appName}`);

    let functions = await client.listFunctions(ctx.input.appName);

    let mapped = functions.map((fn: any) => ({
      functionName: fn.name?.split('/')?.pop() || fn.name,
      resourceId: fn.id,
      invokeUrlTemplate: fn.properties?.invoke_url_template,
      language: fn.properties?.language,
      isDisabled: fn.properties?.isDisabled,
      configHref: fn.properties?.config_href
    }));

    return {
      output: {
        functions: mapped,
        count: mapped.length
      },
      message: `Found **${mapped.length}** function(s) in **${ctx.input.appName}**.${mapped.length > 0 ? `\n\nFunctions: ${mapped.map((f: any) => `\`${f.functionName}\`${f.isDisabled ? ' (disabled)' : ''}`).join(', ')}` : ''}`
    };
  })
  .build();
