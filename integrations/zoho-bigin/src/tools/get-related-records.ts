import { SlateTool } from 'slates';
import { z } from 'zod';
import { BiginClient } from '../lib/client';
import { spec } from '../spec';

export let getRelatedRecords = SlateTool.create(spec, {
  name: 'Get Related Records',
  key: 'get_related_records',
  description: `Retrieve records related to a specific record. For example, get all Notes for a Contact, or all Pipelines associated with an Account. Use the **Get Module Fields** tool or **Get Modules** tool to discover available relationships.`,
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
      page: z.number().optional().describe('Page number (default 1)'),
      perPage: z.number().optional().describe('Records per page (default 200, max 200)')
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

    let result = await client.getRelatedRecords(
      ctx.input.module,
      ctx.input.recordId,
      ctx.input.relatedModule,
      {
        page: ctx.input.page,
        perPage: ctx.input.perPage
      }
    );

    let records = result.data || [];
    let info = result.info || {};

    return {
      output: {
        records,
        moreRecords: info.more_records
      },
      message: `Retrieved **${records.length}** related **${ctx.input.relatedModule}** record(s) for **${ctx.input.module}** record **${ctx.input.recordId}**.`
    };
  })
  .build();
