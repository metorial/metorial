import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCollections = SlateTool.create(spec, {
  name: 'List Collections',
  key: 'list_collections',
  description: `List all collections in the workspace. Collections are the top-level containers that organize documents in Outline.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .default(25)
        .describe('Maximum number of collections to return'),
      offset: z.number().optional().default(0).describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      collections: z.array(
        z.object({
          collectionId: z.string(),
          name: z.string(),
          description: z.string().optional(),
          color: z.string().optional(),
          icon: z.string().optional(),
          permission: z.string().optional(),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      total: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.listCollections({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let collections = (result.data || []).map(c => ({
      collectionId: c.id,
      name: c.name,
      description: c.description,
      color: c.color,
      icon: c.icon,
      permission: c.permission,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    }));

    return {
      output: {
        collections,
        total: collections.length
      },
      message: `Found **${collections.length}** collections.`
    };
  })
  .build();
