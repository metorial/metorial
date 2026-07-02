import { SlateTool } from 'slates';
import { z } from 'zod';
import { BotstarClient } from '../lib/client';
import { spec } from '../spec';

export let manageBotAttributes = SlateTool.create(spec, {
  name: 'Manage Bot Attributes',
  key: 'manage_bot_attributes',
  description: `List, create, update, or delete bot-level attributes (variables). Bot attributes store global data for a bot and support multiple data types. Use "list" to view all attributes, "create" to add one, "update" to modify an existing attribute's value or description, or "delete" to remove one.`
})
  .input(
    z.object({
      botId: z.string().describe('ID of the bot'),
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      attributeId: z
        .string()
        .optional()
        .describe('ID of the attribute (required for update and delete)'),
      name: z.string().optional().describe('Name of the attribute (required for create)'),
      dataType: z
        .enum(['string', 'number', 'date'])
        .optional()
        .describe('Data type (required for create)'),
      description: z.string().optional().describe('Description of the attribute'),
      value: z.string().optional().describe('Value of the attribute'),
      env: z.enum(['draft', 'live']).optional().describe('Environment (draft or live)')
    })
  )
  .output(
    z.object({
      attributes: z
        .array(
          z.object({
            attributeId: z.string().describe('ID of the attribute'),
            name: z.string().optional().describe('Name of the attribute'),
            dataType: z.string().optional().describe('Data type of the attribute'),
            description: z.string().optional().describe('Description'),
            value: z.any().optional().describe('Current value')
          })
        )
        .optional()
        .describe('List of attributes (for list action)'),
      attributeId: z.string().optional().describe('ID of the created/updated attribute'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BotstarClient(ctx.auth.token);
    let { action, botId, attributeId, name, dataType, description, value, env } = ctx.input;

    if (action === 'list') {
      let attrs = await client.listBotAttributes(botId, env);
      let mapped = (Array.isArray(attrs) ? attrs : []).map((attr: any) => ({
        attributeId: attr.id || attr._id || '',
        name: attr.name,
        dataType: attr.data_type,
        description: attr.desc,
        value: attr.value
      }));
      return {
        output: { attributes: mapped, success: true },
        message: `Retrieved **${mapped.length}** bot attribute(s).`
      };
    }

    if (action === 'create') {
      if (!name) throw new Error('Name is required when creating an attribute.');
      if (!dataType) throw new Error('Data type is required when creating an attribute.');
      let result = await client.createBotAttribute(
        botId,
        { name, dataType, desc: description, value },
        env
      );
      return {
        output: {
          attributeId: result.id || result._id || '',
          success: true
        },
        message: `Created bot attribute **${name}**.`
      };
    }

    if (action === 'update') {
      if (!attributeId) throw new Error('Attribute ID is required for updating.');
      let updates: { desc?: string; value?: string } = {};
      if (description !== undefined) updates.desc = description;
      if (value !== undefined) updates.value = value;
      await client.updateBotAttribute(botId, attributeId, updates, env);
      return {
        output: { attributeId, success: true },
        message: `Updated bot attribute **${attributeId}**.`
      };
    }

    if (action === 'delete') {
      if (!attributeId) throw new Error('Attribute ID is required for deleting.');
      await client.deleteBotAttribute(botId, attributeId, env);
      return {
        output: { attributeId, success: true },
        message: `Deleted bot attribute **${attributeId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
