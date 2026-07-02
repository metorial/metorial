import { SlateTool } from 'slates';
import { z } from 'zod';
import { HabiticaClient } from '../lib/client';
import { spec } from '../spec';

export let manageInventory = SlateTool.create(spec, {
  name: 'Manage Inventory',
  key: 'manage_inventory',
  description: `Manage the user's Habitica inventory and equipment. Equip or unequip gear, buy gear, hatch pets, feed pets, purchase items, and sell items.`,
  instructions: [
    'For "equip", type can be "equipped" (battle gear), "costume" (costume), "pet", or "mount".',
    'For "hatch", provide both egg and hatchingPotion keys.',
    'For "feed", provide pet and food keys.',
    'For "sell", type is the item category ("eggs", "hatchingPotions", "food").',
    'For "purchase", type is the item category and key is the specific item.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['equip', 'buy-gear', 'hatch', 'feed', 'purchase', 'sell'])
        .describe('Inventory action to perform'),
      equipType: z
        .enum(['equipped', 'costume', 'pet', 'mount'])
        .optional()
        .describe('Equipment type for equip action'),
      itemKey: z.string().optional().describe('Item key identifier'),
      egg: z.string().optional().describe('Egg key for hatching'),
      hatchingPotion: z.string().optional().describe('Hatching potion key for hatching'),
      pet: z.string().optional().describe('Pet key for feeding'),
      food: z.string().optional().describe('Food key for feeding'),
      itemType: z
        .string()
        .optional()
        .describe(
          'Item category type (for purchase/sell: "eggs", "hatchingPotions", "food", "quests", "gear")'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was performed'),
      message: z.string().optional().describe('Result message from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HabiticaClient({
      userId: ctx.auth.userId,
      token: ctx.auth.token,
      xClient: ctx.config.xClient
    });

    if (ctx.input.action === 'equip') {
      if (!ctx.input.equipType || !ctx.input.itemKey)
        throw new Error('equipType and itemKey are required for equip action');
      await client.equipItem(ctx.input.equipType, ctx.input.itemKey);
      return {
        output: { success: true },
        message: `Equipped **${ctx.input.itemKey}** as **${ctx.input.equipType}**`
      };
    }

    if (ctx.input.action === 'buy-gear') {
      if (!ctx.input.itemKey) throw new Error('itemKey is required for buy-gear action');
      await client.buyGear(ctx.input.itemKey);
      return {
        output: { success: true },
        message: `Bought gear **${ctx.input.itemKey}**`
      };
    }

    if (ctx.input.action === 'hatch') {
      if (!ctx.input.egg || !ctx.input.hatchingPotion)
        throw new Error('egg and hatchingPotion are required for hatch action');
      await client.hatchPet(ctx.input.egg, ctx.input.hatchingPotion);
      return {
        output: { success: true },
        message: `Hatched **${ctx.input.egg}** with **${ctx.input.hatchingPotion}** potion`
      };
    }

    if (ctx.input.action === 'feed') {
      if (!ctx.input.pet || !ctx.input.food)
        throw new Error('pet and food are required for feed action');
      let result = await client.feedPet(ctx.input.pet, ctx.input.food);
      return {
        output: { success: true, message: typeof result === 'string' ? result : undefined },
        message: `Fed **${ctx.input.pet}** with **${ctx.input.food}**`
      };
    }

    if (ctx.input.action === 'purchase') {
      if (!ctx.input.itemType || !ctx.input.itemKey)
        throw new Error('itemType and itemKey are required for purchase action');
      await client.purchaseItem(ctx.input.itemType, ctx.input.itemKey);
      return {
        output: { success: true },
        message: `Purchased **${ctx.input.itemKey}** (${ctx.input.itemType})`
      };
    }

    if (ctx.input.action === 'sell') {
      if (!ctx.input.itemType || !ctx.input.itemKey)
        throw new Error('itemType and itemKey are required for sell action');
      await client.sellItem(ctx.input.itemType, ctx.input.itemKey);
      return {
        output: { success: true },
        message: `Sold **${ctx.input.itemKey}** (${ctx.input.itemType})`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
