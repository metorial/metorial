import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeedleClient } from '../lib/client';
import { spec } from '../spec';

export let listConnectorFiles = SlateTool.create(spec, {
  name: 'List Connector Files',
  key: 'list_connector_files',
  description:
    'List files synchronized by a data source connector, including file IDs, source URLs, sizes, and timestamps. Use offset to retrieve another page.',
  constraints: ['Maximum of 500 files per request.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      connectorId: z
        .string()
        .describe('Connector ID from list_connectors or the Needle dashboard'),
      offset: z.number().optional().describe('Non-negative whole number of files to skip'),
      limit: z
        .number()
        .optional()
        .describe('Non-negative whole number of files to return, up to 500')
    })
  )
  .output(
    z.object({
      files: z.array(
        z.object({
          fileId: z.string(),
          name: z.string(),
          type: z.string(),
          url: z.string(),
          userId: z.string(),
          connectorId: z.string().nullable(),
          size: z.number().nullable(),
          md5Hash: z.string().nullable(),
          createdAt: z.string(),
          updatedAt: z.string().nullable()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeedleClient(ctx.auth.token);
    let files = await client.listConnectorFiles(ctx.input.connectorId, {
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });
    return {
      output: {
        files: files.map(file => ({
          fileId: file.id,
          name: file.name,
          type: file.type,
          url: file.url,
          userId: file.user_id,
          connectorId: file.connector_id ?? null,
          size: file.size ?? null,
          md5Hash: file.md5_hash ?? null,
          createdAt: file.created_at,
          updatedAt: file.updated_at ?? null
        }))
      },
      message: `Found **${files.length}** file(s) synchronized by connector \`${ctx.input.connectorId}\`.`
    };
  })
  .build();
