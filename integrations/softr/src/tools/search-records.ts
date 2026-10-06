import { SlateTool } from 'slates';
import { DatabaseClient } from '../lib/client';
import {
  conditionSchema,
  dbId,
  nativeCondition,
  page,
  recordOutput,
  tblId
} from '../lib/schemas';
import { connection, id, paging, z } from '../lib/validation';
import { spec } from '../spec';
export const searchRecords = SlateTool.create(spec, {
  name: 'Search Records',
  key: 'search_records',
  description:
    'Search native record pages in a table from list_tables using documented filters, sorting and offset pagination. Legacy field/value/values filter inputs map to native leftSide/rightSide; use two legacy values or native bounds for ranges.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      databaseId: dbId,
      tableId: tblId,
      filter: z.object({ condition: conditionSchema }).optional(),
      sort: z
        .array(z.object({ sortingField: z.string(), sortType: z.enum(['ASC', 'DESC']) }))
        .optional(),
      offset: z.number().optional(),
      limit: z.number().optional(),
      fieldNames: z.boolean().optional()
    })
  )
  .output(
    z.object({
      records: z.array(recordOutput),
      total: z.number().optional(),
      offset: z.number().optional(),
      limit: z.number().optional(),
      hasMore: z.boolean().optional(),
      nextOffset: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    const p = paging(ctx.input.offset, ctx.input.limit),
      sorting = ctx.input.sort?.map(s => ({
        ...s,
        sortingField: id(s.sortingField, 'sort field ID')
      }));
    const raw = await new DatabaseClient(connection(ctx.auth, ctx.config)).searchRecords(
      ctx.input.databaseId,
      ctx.input.tableId,
      {
        filter: ctx.input.filter
          ? { condition: nativeCondition(ctx.input.filter.condition) }
          : undefined,
        sorting,
        paging: p
      },
      ctx.input.fieldNames
    );
    return {
      output: page(raw, ctx.input.tableId, p),
      message:
        'Returned the native matching page; nextOffset is present only when more records remain.'
    };
  })
  .build();
