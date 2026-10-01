import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../../../spec';
import { BiginClient } from '../lib/client';

export let getRelatedRecords = SlateTool.create(spec, {
  name: 'Bigin Get Related Records',
  key: 'bigin_get_related_records',
  description: `Retrieve records related to a specific record. For example, get all Notes for a Contact, or all Pipelines associated with an Account. Use bigin_get_related_lists to discover related-list API names and bigin_get_module_fields to discover fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      module: z
        .enum(['Contacts', 'Accounts', 'Pipelines', 'Products', 'Tasks', 'Events', 'Calls'])
        .describe('Module API name of the parent record'),
      recordId: z.string().describe('ID of the parent record'),
      relatedModule: z
        .string()
        .describe('API name of the related module (e.g., Notes, Products, Contacts)'),
      fields: z
        .string()
        .optional()
        .describe(
          'Comma-separated related-record field API names (max 50). Defaults to discovered fields. Emails ignores field selection.'
        ),
      page: z.number().int().min(1).optional().describe('Page number (default 1)'),
      perPage: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe('Records per page (default 200, max 200)')
    })
  )
  .output(
    z.object({
      records: z.array(z.record(z.string(), z.any())).describe('Array of related records'),
      moreRecords: z.boolean().optional().describe('Whether more records are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BiginClient({
      token: ctx.auth.token,
      apiDomain: ctx.auth.apiDomain
    });

    let fields = ctx.input.fields;
    if (ctx.input.relatedModule !== 'Emails' && !fields?.trim()) {
      let relatedLists = await client.getRelatedLists(ctx.input.module);
      let related = relatedLists?.related_lists?.find(
        (list: any) => list.api_name === ctx.input.relatedModule
      );
      let module = related?.module?.api_name ?? ctx.input.relatedModule;
      if (module === 'Deals') module = 'Pipelines';
      let metadata = await client.getFields(module);
      fields = (metadata?.fields ?? [])
        .map((field: any) => field.api_name)
        .filter(Boolean)
        .slice(0, 50)
        .join(',');
    }
    if (ctx.input.relatedModule !== 'Emails' && !fields?.trim())
      throw createApiServiceError(
        'Provide related-record fields using bigin_get_module_fields.'
      );
    if (fields && fields.split(',').length > 50)
      throw createApiServiceError('Specify at most 50 fields.');

    let result = await client.getRelatedRecords(
      ctx.input.module,
      ctx.input.recordId,
      ctx.input.relatedModule,
      {
        fields,
        page: ctx.input.page,
        perPage: ctx.input.perPage
      }
    );

    let records = result?.data || [];
    let info = result?.info || {};

    return {
      output: {
        records,
        moreRecords: info.more_records
      },
      message: `Retrieved **${records.length}** related **${ctx.input.relatedModule}** record(s) for **${ctx.input.module}** record **${ctx.input.recordId}**.`
    };
  })
  .build();
