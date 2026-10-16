import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { optionalString, pageInfoSchema, requireString, responseList } from '../lib/schemas';
import { spec } from '../spec';

export let listBases = SlateTool.create(spec, {
  name: 'List Bases',
  key: 'list_bases',
  description: `List bases accessible in the NocoDB instance. Without workspaceId, use the instance-wide v2 route. With workspaceId, return one provider page of bases and its pagination metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe(
          'Workspace ID for one page of workspace-specific bases. Omit to list bases using the instance-wide v2 route. Published v2 continuation parameters have not been established.'
        )
    })
  )
  .output(
    z.object({
      bases: z
        .array(
          z.object({
            baseId: z.string().describe('Base ID'),
            title: z.string().describe('Base title'),
            description: z.string().optional().describe('Base description'),
            color: z.string().optional().describe('Base color'),
            meta: z.any().optional()
          })
        )
        .describe('Array of base objects'),
      pageInfo: pageInfoSchema
        .optional()
        .describe(
          'Provider pagination metadata; a false isLastPage means additional bases exist'
        ),
      raw: z.any().optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let result = await client.listBases(ctx.input.workspaceId);
    let list = responseList(result, 'bases');
    let bases = list.map((b: any) => ({
      baseId: requireString(b.id, 'baseId'),
      title: requireString(b.title, 'b.title'),
      description: optionalString(b.description),
      color: optionalString(b.color),
      meta: b.meta
    }));

    return {
      output: { bases, pageInfo: result?.pageInfo, raw: result },
      message: `Found **${bases.length}** base(s).${result?.pageInfo?.isLastPage === false ? ' NocoDB reports additional bases; continuation controls for this v2 route have not been established.' : ''}`
    };
  })
  .build();
