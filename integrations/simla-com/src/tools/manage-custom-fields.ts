import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCustomFields = SlateTool.create(spec, {
  name: 'Manage Custom Fields',
  key: 'manage_custom_fields',
  description: `List, get, create, or edit custom fields for entities (customers, orders, etc.). Custom fields extend the data model with additional attributes. Also supports custom dictionaries that provide lookup values for custom fields.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'listFields',
          'getField',
          'createField',
          'editField',
          'listDictionaries',
          'getDictionary',
          'createDictionary',
          'editDictionary'
        ])
        .describe('Operation to perform'),
      entity: z
        .string()
        .optional()
        .describe('Entity type (e.g., "customer", "order") - for field operations'),
      fieldCode: z.string().optional().describe('Custom field code (for get/edit field)'),
      dictionaryCode: z
        .string()
        .optional()
        .describe('Dictionary code (for get/edit dictionary)'),
      filter: z
        .record(z.string(), z.any())
        .optional()
        .describe('Filter criteria (for list operations)'),
      page: z.number().optional(),
      limit: z.number().optional(),
      fieldDefinition: z
        .object({
          name: z.string().optional().describe('Field display name'),
          code: z.string().optional().describe('Field code (for creation)'),
          type: z
            .string()
            .optional()
            .describe(
              'Field type (string, integer, numeric, boolean, date, text, dictionary)'
            ),
          ordering: z.number().optional().describe('Display order'),
          displayArea: z.string().optional().describe('Display area in the UI'),
          required: z.boolean().optional(),
          inFilter: z.boolean().optional().describe('Available in filter'),
          inList: z.boolean().optional().describe('Shown in list view'),
          inGroupActions: z.boolean().optional().describe('Available in group actions'),
          dictionaryCode: z
            .string()
            .optional()
            .describe('Dictionary code (for dictionary type fields)')
        })
        .optional()
        .describe('Custom field definition (for create/edit field)'),
      dictionaryDefinition: z
        .object({
          name: z.string().optional().describe('Dictionary name'),
          code: z.string().optional().describe('Dictionary code (for creation)'),
          elements: z
            .array(
              z.object({
                name: z.string().describe('Element name'),
                code: z.string().describe('Element code'),
                ordering: z.number().optional()
              })
            )
            .optional()
            .describe('Dictionary elements')
        })
        .optional()
        .describe('Dictionary definition (for create/edit dictionary)')
    })
  )
  .output(
    z.object({
      fields: z.array(z.record(z.string(), z.any())).optional(),
      field: z.record(z.string(), z.any()).optional(),
      dictionaries: z.array(z.record(z.string(), z.any())).optional(),
      dictionary: z.record(z.string(), z.any()).optional(),
      createdCode: z.string().optional(),
      updated: z.boolean().optional(),
      totalCount: z.number().optional(),
      currentPage: z.number().optional(),
      totalPages: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      site: ctx.config.site
    });

    let { action } = ctx.input;

    if (action === 'listFields') {
      let result = await client.getCustomFields(
        ctx.input.filter,
        ctx.input.page,
        ctx.input.limit
      );
      return {
        output: {
          fields: result.customFields,
          totalCount: result.pagination.totalCount,
          currentPage: result.pagination.currentPage,
          totalPages: result.pagination.totalPageCount
        },
        message: `Found **${result.pagination.totalCount}** custom fields.`
      };
    }

    if (action === 'getField') {
      if (!ctx.input.entity || !ctx.input.fieldCode)
        throw new Error('entity and fieldCode are required.');
      let field = await client.getCustomField(ctx.input.entity, ctx.input.fieldCode);
      return {
        output: { field },
        message: `Retrieved custom field **${ctx.input.fieldCode}**.`
      };
    }

    if (action === 'createField') {
      if (!ctx.input.entity || !ctx.input.fieldDefinition)
        throw new Error('entity and fieldDefinition are required.');
      let result = await client.createCustomField(ctx.input.entity, ctx.input.fieldDefinition);
      return {
        output: { createdCode: result.code },
        message: `Created custom field **${result.code}**.`
      };
    }

    if (action === 'editField') {
      if (!ctx.input.entity || !ctx.input.fieldCode || !ctx.input.fieldDefinition) {
        throw new Error('entity, fieldCode, and fieldDefinition are required.');
      }
      await client.editCustomField(
        ctx.input.entity,
        ctx.input.fieldCode,
        ctx.input.fieldDefinition
      );
      return {
        output: { updated: true },
        message: `Updated custom field **${ctx.input.fieldCode}**.`
      };
    }

    if (action === 'listDictionaries') {
      let result = await client.getCustomDictionaries(
        ctx.input.filter,
        ctx.input.page,
        ctx.input.limit
      );
      return {
        output: {
          dictionaries: result.customDictionaries,
          totalCount: result.pagination.totalCount,
          currentPage: result.pagination.currentPage,
          totalPages: result.pagination.totalPageCount
        },
        message: `Found **${result.pagination.totalCount}** dictionaries.`
      };
    }

    if (action === 'getDictionary') {
      if (!ctx.input.dictionaryCode) throw new Error('dictionaryCode is required.');
      let dictionary = await client.getCustomDictionary(ctx.input.dictionaryCode);
      return {
        output: { dictionary },
        message: `Retrieved dictionary **${ctx.input.dictionaryCode}**.`
      };
    }

    if (action === 'createDictionary') {
      if (!ctx.input.dictionaryDefinition)
        throw new Error('dictionaryDefinition is required.');
      let result = await client.createCustomDictionary(ctx.input.dictionaryDefinition);
      return {
        output: { createdCode: result.code },
        message: `Created dictionary **${result.code}**.`
      };
    }

    if (action === 'editDictionary') {
      if (!ctx.input.dictionaryCode || !ctx.input.dictionaryDefinition) {
        throw new Error('dictionaryCode and dictionaryDefinition are required.');
      }
      await client.editCustomDictionary(
        ctx.input.dictionaryCode,
        ctx.input.dictionaryDefinition
      );
      return {
        output: { updated: true },
        message: `Updated dictionary **${ctx.input.dictionaryCode}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
