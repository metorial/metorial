import { SlateTool } from 'slates';
import { z } from 'zod';
import { BotstarClient } from '../lib/client';
import { spec } from '../spec';

export let listCmsEntities = SlateTool.create(spec, {
  name: 'List CMS Entities',
  key: 'list_cms_entities',
  description: `Retrieve all CMS entities for a specific bot. CMS entities are collections of items that share the same attributes (fields). Use entity IDs to manage individual items within each entity.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      botId: z.string().describe('ID of the bot'),
      env: z
        .enum(['draft', 'live'])
        .optional()
        .describe('Environment to query (draft or live)')
    })
  )
  .output(
    z.object({
      entities: z
        .array(
          z.object({
            entityId: z.string().describe('Unique identifier of the entity'),
            name: z.string().describe('Name of the entity'),
            fields: z.array(z.any()).optional().describe('Fields defined on the entity')
          })
        )
        .describe('List of CMS entities')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BotstarClient(ctx.auth.token);
    let entities = await client.listCmsEntities(ctx.input.botId, ctx.input.env);

    let mapped = (Array.isArray(entities) ? entities : []).map((entity: any) => ({
      entityId: entity.id || entity._id || '',
      name: entity.name || '',
      fields: entity.fields
    }));

    return {
      output: { entities: mapped },
      message: `Retrieved **${mapped.length}** CMS entit${mapped.length === 1 ? 'y' : 'ies'}.`
    };
  })
  .build();
