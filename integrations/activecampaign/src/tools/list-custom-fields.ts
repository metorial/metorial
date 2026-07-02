import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCustomFields = SlateTool.create(spec, {
  name: 'List Custom Fields',
  key: 'list_custom_fields',
  description: `Lists custom field definitions for contacts, deals, or accounts. Use this to discover field IDs and types before setting custom field values.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      resourceType: z
        .enum(['contact', 'deal', 'account'])
        .describe('Type of resource to list custom fields for'),
      limit: z.number().optional().describe('Maximum number of fields to return'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      customFields: z.array(
        z.object({
          fieldId: z.string(),
          title: z.string().optional(),
          type: z.string().optional(),
          options: z.array(z.string()).optional(),
          isRequired: z.boolean().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    let params: Record<string, any> = {};
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.offset) params.offset = ctx.input.offset;

    let result: any;
    let fieldsKey: string;

    switch (ctx.input.resourceType) {
      case 'contact':
        result = await client.listContactCustomFields(params);
        fieldsKey = 'fields';
        break;
      case 'deal':
        result = await client.listDealCustomFields(params);
        fieldsKey = 'dealCustomFieldMeta';
        break;
      case 'account':
        result = await client.listAccountCustomFields(params);
        fieldsKey = 'accountCustomFieldMeta';
        break;
    }

    let fields = (result[fieldsKey] || []).map((f: any) => ({
      fieldId: f.id,
      title: f.title || f.fieldLabel || undefined,
      type: f.type || f.fieldType || undefined,
      options:
        (f.options ?? f.fieldOptions)
          ? Array.isArray(f.options ?? f.fieldOptions)
            ? (f.options ?? f.fieldOptions)
            : Object.values(f.options ?? f.fieldOptions)
          : undefined,
      isRequired:
        f.isRequired === '1' ||
        f.isRequired === 1 ||
        f.isrequired === '1' ||
        f.isrequired === 1
          ? true
          : undefined
    }));

    return {
      output: { customFields: fields },
      message: `Found **${fields.length}** custom fields for ${ctx.input.resourceType}s.`
    };
  })
  .build();
