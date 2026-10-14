import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSerialNumbers = SlateTool.create(spec, {
  name: 'List Serial Numbers',
  key: 'list_serial_numbers',
  description:
    'Browse Rentman equipment serial numbers, asset locations, inspection dates, and book values. Optionally scope results to equipment discovered with list_equipment.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      equipmentId: z
        .number()
        .optional()
        .describe('Equipment ID from list_equipment. Omit to list all serial numbers.'),
      limit: z
        .number()
        .optional()
        .default(25)
        .describe('Maximum number of results (max 1500).'),
      offset: z.number().optional().default(0).describe('Number of results to skip.'),
      cursor: z
        .string()
        .optional()
        .describe(
          'Opaque cursor token from a previous nextPageUrl. Pass it unchanged and repeat the original filters, resource IDs, sort, and fields.'
        ),
      sort: z
        .string()
        .optional()
        .describe('Comma-separated sort fields prefixed with + or -.'),
      fields: z.string().optional().describe('Comma-separated provider fields to return.')
    })
  )
  .output(
    z.object({
      serialNumbers: z
        .array(z.record(z.string(), z.any()))
        .describe(
          'Serial number records with stable id, equipment reference, serial, active state, and asset details.'
        ),
      itemCount: z.number().describe('Number of items in this response page.'),
      limit: z.number(),
      offset: z.number(),
      nextPageUrl: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let params = {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      cursor: ctx.input.cursor,
      sort: ctx.input.sort,
      fields: ctx.input.fields
    };
    let result =
      ctx.input.equipmentId === undefined
        ? await client.list('serialnumbers', params)
        : await client.listNested('equipment', ctx.input.equipmentId, 'serialnumbers', params);
    return {
      output: {
        serialNumbers: result.data,
        itemCount: result.itemCount,
        limit: result.limit,
        offset: result.offset,
        nextPageUrl: result.next_page_url
      },
      message: `Retrieved **${result.data.length}** serial numbers.`
    };
  })
  .build();
