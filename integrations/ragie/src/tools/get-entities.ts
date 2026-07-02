import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEntities = SlateTool.create(spec, {
  name: 'Get Entities',
  key: 'get_entities',
  description: `Retrieve extracted entities either by instruction (all entities extracted by a specific instruction across documents) or by document (all entities from a specific document across all instructions).
Use this to access structured data extracted from documents by entity extraction instructions.`,
  instructions: [
    'Provide instructionId to get all entities extracted by that instruction.',
    'Provide documentId to get all entities from that document.',
    'You must provide exactly one of instructionId or documentId.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      instructionId: z
        .string()
        .optional()
        .describe(
          'Instruction ID to get entities for (returns entities across all documents)'
        ),
      documentId: z
        .string()
        .optional()
        .describe('Document ID to get entities for (returns entities from all instructions)'),
      cursor: z
        .string()
        .optional()
        .describe('Pagination cursor (only for instruction-based queries)'),
      pageSize: z
        .number()
        .optional()
        .describe('Page size (only for instruction-based queries)'),
      partition: z.string().optional().describe('Partition override')
    })
  )
  .output(
    z.object({
      entities: z.array(z.any()).describe('Extracted entities'),
      nextCursor: z.string().nullable().optional().describe('Cursor for next page'),
      totalCount: z.number().optional().describe('Total entity count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      partition: ctx.config.partition
    });

    if (ctx.input.instructionId) {
      let result = await client.getInstructionEntities(ctx.input.instructionId, {
        cursor: ctx.input.cursor,
        pageSize: ctx.input.pageSize,
        partition: ctx.input.partition
      });
      return {
        output: {
          entities: result.entities,
          nextCursor: result.pagination.nextCursor,
          totalCount: result.pagination.totalCount
        },
        message: `Retrieved **${result.entities.length}** entities for instruction \`${ctx.input.instructionId}\`.`
      };
    }

    if (ctx.input.documentId) {
      let entities = await client.getDocumentEntities(ctx.input.documentId, {
        partition: ctx.input.partition
      });
      return {
        output: {
          entities,
          nextCursor: null
        },
        message: `Retrieved **${entities.length}** entities for document \`${ctx.input.documentId}\`.`
      };
    }

    throw new Error('Provide either instructionId or documentId.');
  })
  .build();
