import { SlateTool } from 'slates';
import { z } from 'zod';
import { BotstarClient } from '../lib/client';
import { botIdSchema, botScopeGuidance, entityIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getCmsEntity = SlateTool.create(spec, {
  name: 'Get CMS Entity',
  key: 'get_cms_entity',
  description: `Retrieve a CMS entity with its field definitions and unique field keys for item updates. Call list_cms_entities to discover entity IDs. ${botScopeGuidance}`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      botId: botIdSchema,
      entityId: entityIdSchema,
      env: z.enum(['draft', 'live']).optional().describe('Environment to read')
    })
  )
  .output(
    z.object({
      entityId: z.string().describe('ID of the entity'),
      name: z.string().describe('Name of the entity'),
      fields: z
        .array(z.any())
        .describe('Field definitions including unique_name and data_type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BotstarClient(ctx.auth.token);
    let entity = await client.getCmsEntity(ctx.input.botId, ctx.input.entityId, ctx.input.env);
    return {
      output: {
        entityId: entity.id || entity._id || ctx.input.entityId,
        name: entity.name ?? '',
        fields: entity.fields ?? []
      },
      message: `Retrieved CMS entity **${entity.name ?? ctx.input.entityId}**.`
    };
  })
  .build();
