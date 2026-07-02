import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getModuleMetadata = SlateTool.create(spec, {
  name: 'Get Module Metadata',
  key: 'get_module_metadata',
  description: `Retrieve metadata about CRM modules including available fields, layouts, and module configuration.
Without a module name, lists all available modules. With a module name, returns fields and layouts for that module.
Useful for discovering field API names, data types, picklist values, and module structure.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      module: z
        .string()
        .optional()
        .describe(
          'API name of a specific module to get fields and layouts for. If omitted, returns a list of all modules.'
        ),
      includeFields: z
        .boolean()
        .optional()
        .describe('Include field metadata when a module is specified (default: true)'),
      includeLayouts: z
        .boolean()
        .optional()
        .describe('Include layout metadata when a module is specified (default: false)')
    })
  )
  .output(
    z.object({
      modules: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of all available modules (when no module specified)'),
      fields: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Field metadata for the specified module'),
      layouts: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Layout metadata for the specified module')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl
    });

    if (!ctx.input.module) {
      let result = await client.getModules();
      let modules = result?.modules || [];
      return {
        output: { modules },
        message: `Retrieved **${modules.length}** modules.`
      };
    }

    let includeFields = ctx.input.includeFields !== false;
    let includeLayouts = ctx.input.includeLayouts === true;

    let fields: any[] | undefined;
    let layouts: any[] | undefined;

    if (includeFields) {
      let fieldsResult = await client.getModuleFields(ctx.input.module);
      fields = fieldsResult?.fields || [];
    }

    if (includeLayouts) {
      let layoutsResult = await client.getModuleLayouts(ctx.input.module);
      layouts = layoutsResult?.layouts || [];
    }

    let parts: string[] = [];
    if (fields) parts.push(`**${fields.length}** fields`);
    if (layouts) parts.push(`**${layouts.length}** layouts`);

    return {
      output: { fields, layouts },
      message: `Retrieved ${parts.join(' and ')} for **${ctx.input.module}**.`
    };
  })
  .build();
