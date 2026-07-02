import { SlateTool } from 'slates';
import { z } from 'zod';
import { BotstarClient } from '../lib/client';
import { spec } from '../spec';

export let createUserAttribute = SlateTool.create(spec, {
  name: 'Create User Attribute',
  key: 'create_user_attribute',
  description: `Create a new custom attribute field for users of a specific bot. Once created, this attribute can be set on individual users. Supported types are string, number, date, and boolean.`
})
  .input(
    z.object({
      botId: z.string().describe('ID of the bot to add the user attribute to'),
      fieldName: z.string().describe('Name of the new custom attribute field'),
      fieldType: z
        .enum(['string', 'number', 'date', 'boolean'])
        .describe('Data type of the attribute')
    })
  )
  .output(
    z.object({
      attributeId: z.string().describe('ID of the created attribute'),
      fieldName: z.string().describe('Name of the attribute'),
      fieldType: z.string().describe('Data type of the attribute')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BotstarClient(ctx.auth.token);
    let result = await client.createUserAttribute(
      ctx.input.botId,
      ctx.input.fieldName,
      ctx.input.fieldType
    );

    return {
      output: {
        attributeId: result.id || result._id || '',
        fieldName: result.field_name || ctx.input.fieldName,
        fieldType: result.field_type || ctx.input.fieldType
      },
      message: `Created user attribute **${ctx.input.fieldName}** (${ctx.input.fieldType}).`
    };
  })
  .build();
