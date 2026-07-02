import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listStructures = SlateTool.create(spec, {
  name: 'List Structures',
  key: 'list_structures',
  description: `List all deployed structures in your Griptape Cloud organization. Structures are custom Python components—pipelines, workflows, or agents—that can be triggered remotely.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number to retrieve'),
      pageSize: z.number().optional().describe('Number of items per page')
    })
  )
  .output(
    z.object({
      structures: z
        .array(
          z.object({
            structureId: z.string().describe('ID of the structure'),
            name: z.string().describe('Name of the structure'),
            description: z.string().optional().describe('Description of the structure'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .describe('List of structures'),
      totalCount: z.number().describe('Total number of structures'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let result = await client.listStructures({
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let structures = result.items.map((s: any) => ({
      structureId: s.structure_id,
      name: s.name,
      description: s.description,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }));

    return {
      output: {
        structures,
        totalCount: result.pagination.totalCount,
        totalPages: result.pagination.totalPages
      },
      message: `Found **${result.pagination.totalCount}** structure(s).`
    };
  })
  .build();
