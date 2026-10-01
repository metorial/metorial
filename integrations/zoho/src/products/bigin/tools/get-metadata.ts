import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../../../spec';
import { BiginClient } from '../lib/client';

export let getModules = SlateTool.create(spec, {
  name: 'Bigin Get Modules',
  key: 'bigin_get_modules',
  description: `Retrieve the list of all available modules in the Bigin account, including their API names, display names, and capabilities (creatable, editable, deletable, etc.). Useful for discovering which modules are available.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      modules: z
        .array(
          z.object({
            apiName: z.string().describe('API name of the module'),
            moduleName: z.string().optional().describe('Display name of the module'),
            singularLabel: z.string().optional().describe('Singular form of the module name'),
            pluralLabel: z.string().optional().describe('Plural form of the module name'),
            creatable: z.boolean().optional(),
            editable: z.boolean().optional(),
            deletable: z.boolean().optional(),
            viewable: z.boolean().optional()
          })
        )
        .describe('Available modules')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BiginClient({
      token: ctx.auth.token,
      apiDomain: ctx.auth.apiDomain
    });

    let result = await client.getModules();
    let modules = (result.modules || []).map((m: any) => ({
      apiName: m.api_name,
      moduleName: m.module_name ?? undefined,
      singularLabel: m.singular_label ?? undefined,
      pluralLabel: m.plural_label ?? undefined,
      creatable: m.creatable ?? undefined,
      editable: m.editable ?? undefined,
      deletable: m.deletable ?? undefined,
      viewable: m.viewable ?? undefined
    }));

    return {
      output: { modules },
      message: `Retrieved **${modules.length}** module(s).`
    };
  })
  .build();

export let getModuleFields = SlateTool.create(spec, {
  name: 'Bigin Get Module Fields',
  key: 'bigin_get_module_fields',
  description: `Retrieve the field definitions (metadata) for a specific Bigin module. Returns field API names, labels, data types, whether they are mandatory or read-only, picklist values, and more. Use this to understand the data structure before creating or updating records.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      module: z
        .string()
        .describe(
          'Module API name, e.g. Contacts, Accounts, Pipelines, Products, Tasks, Events, Calls'
        )
    })
  )
  .output(
    z.object({
      fields: z
        .array(
          z.object({
            fieldId: z.string().optional().describe('Unique field ID'),
            apiName: z.string().describe('API name to use in record operations'),
            fieldLabel: z.string().optional().describe('Display label'),
            dataType: z
              .string()
              .optional()
              .describe('Data type (text, ownerlookup, picklist, etc.)'),
            mandatory: z
              .boolean()
              .optional()
              .describe('Whether the field is system mandatory'),
            readOnly: z.boolean().optional().describe('Whether the field is read-only'),
            maxLength: z.number().optional().describe('Maximum character length'),
            customField: z.boolean().optional().describe('Whether this is a custom field'),
            pickListValues: z
              .array(z.record(z.string(), z.any()))
              .optional()
              .describe('Picklist options if applicable')
          })
        )
        .describe('Field definitions for the module')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BiginClient({
      token: ctx.auth.token,
      apiDomain: ctx.auth.apiDomain
    });

    let result = await client.getFields(ctx.input.module);
    let fields = (result.fields || []).map((f: any) => ({
      fieldId: f.id ?? undefined,
      apiName: f.api_name,
      fieldLabel: f.field_label ?? undefined,
      dataType: f.data_type ?? undefined,
      mandatory: f.system_mandatory ?? undefined,
      readOnly: f.read_only ?? undefined,
      maxLength: f.length ?? undefined,
      customField: f.custom_field ?? undefined,
      pickListValues: f.pick_list_values?.length > 0 ? f.pick_list_values : undefined
    }));

    return {
      output: { fields },
      message: `Retrieved **${fields.length}** field(s) for **${ctx.input.module}**.`
    };
  })
  .build();

export let getModuleLayouts = SlateTool.create(spec, {
  name: 'Bigin Get Module Layouts',
  key: 'bigin_get_module_layouts',
  description: `Retrieve the layout definitions for a specific Bigin module. Layouts define which fields appear in which sections and their arrangement.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      module: z.string().describe('Module API name, e.g. Contacts, Accounts, Pipelines')
    })
  )
  .output(
    z.object({
      layouts: z.array(z.record(z.string(), z.any())).describe('Layout definitions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BiginClient({
      token: ctx.auth.token,
      apiDomain: ctx.auth.apiDomain
    });

    let result = await client.getLayouts(ctx.input.module);
    let layouts = result.layouts || [];

    return {
      output: { layouts },
      message: `Retrieved **${layouts.length}** layout(s) for **${ctx.input.module}**.`
    };
  })
  .build();

export let getCustomViews = SlateTool.create(spec, {
  name: 'Bigin Get Custom Views',
  key: 'bigin_get_custom_views',
  description: `Retrieve the custom views defined for a specific Bigin module. Custom view IDs can be used to filter records when using the **Get Records** tool.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      module: z.string().describe('Module API name, e.g. Contacts, Accounts, Pipelines')
    })
  )
  .output(
    z.object({
      customViews: z.array(z.record(z.string(), z.any())).describe('Custom view definitions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BiginClient({
      token: ctx.auth.token,
      apiDomain: ctx.auth.apiDomain
    });

    let result = await client.getCustomViews(ctx.input.module);
    let customViews = result.custom_views || [];

    return {
      output: { customViews },
      message: `Retrieved **${customViews.length}** custom view(s) for **${ctx.input.module}**.`
    };
  })
  .build();

export let getRelatedLists = SlateTool.create(spec, {
  name: 'Bigin Get Bigin Related Lists',
  key: 'bigin_get_related_lists',
  description:
    'Discover the related-list API names and relationships available for a Bigin module. Use api_name with bigin_get_related_records.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      module: z.string().describe('Bigin module API name, such as Contacts or Pipelines.')
    })
  )
  .output(z.object({ relatedLists: z.array(z.record(z.string(), z.any())) }))
  .handleInvocation(async ctx => {
    let client = new BiginClient(ctx.auth);
    let result = await client.getRelatedLists(ctx.input.module);
    let relatedLists = result?.related_lists ?? [];
    return {
      output: { relatedLists },
      message: `Retrieved ${relatedLists.length} related lists.`
    };
  })
  .build();
