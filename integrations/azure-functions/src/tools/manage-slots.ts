import { SlateTool } from 'slates';
import { z } from 'zod';
import { ArmClient } from '../lib/client';
import { spec } from '../spec';

let slotSummarySchema = z.object({
  slotName: z.string().describe('Name of the deployment slot'),
  resourceId: z.string().describe('Full ARM resource ID'),
  state: z.string().optional().describe('Current state of the slot'),
  defaultHostName: z.string().optional().describe('Default hostname for the slot')
});

export let manageSlots = SlateTool.create(spec, {
  name: 'Manage Deployment Slots',
  key: 'manage_slots',
  description: `Manage deployment slots for an Azure Function App. Supports listing, creating, deleting, and swapping slots. Deployment slots let you run different versions of your function app and swap them into production seamlessly.`,
  instructions: [
    'Use action "list" to see all slots for a function app.',
    'Use action "get" to get details of a specific slot.',
    'Use action "create" to create a new deployment slot.',
    'Use action "delete" to remove a deployment slot.',
    'Use action "swap" to swap a slot with production or another slot.'
  ]
})
  .input(
    z.object({
      appName: z.string().describe('Name of the function app'),
      action: z
        .enum(['list', 'get', 'create', 'delete', 'swap'])
        .describe('Action to perform'),
      slotName: z
        .string()
        .optional()
        .describe('Name of the slot (required for get, create, delete, and swap)'),
      targetSlotName: z
        .string()
        .default('production')
        .describe('Target slot name for swap (defaults to "production")'),
      location: z
        .string()
        .optional()
        .describe('Azure region for creating a new slot (required for create)')
    })
  )
  .output(
    z.object({
      slots: z.array(slotSummarySchema).optional().describe('List of slots (for list action)'),
      slot: slotSummarySchema.optional().describe('Slot details (for get/create actions)'),
      action: z.string().describe('Action that was performed'),
      success: z.boolean().describe('Whether the action completed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ArmClient({
      token: ctx.auth.token,
      subscriptionId: ctx.config.subscriptionId,
      resourceGroupName: ctx.config.resourceGroupName
    });

    let { appName, action, slotName, targetSlotName, location } = ctx.input;

    if (action !== 'list' && !slotName) {
      throw new Error('slotName is required for this action');
    }

    ctx.info(`${action} slot(s) for ${appName}`);

    if (action === 'list') {
      let slots = await client.listSlots(appName);
      let mapped = slots.map((s: any) => ({
        slotName: s.name?.split('/')?.pop() || s.name,
        resourceId: s.id,
        state: s.properties?.state,
        defaultHostName: s.properties?.defaultHostName
      }));

      return {
        output: { slots: mapped, action, success: true },
        message: `Found **${mapped.length}** deployment slot(s) for **${appName}**.${mapped.length > 0 ? `\n\nSlots: ${mapped.map((s: any) => `\`${s.slotName}\` (${s.state || 'unknown'})`).join(', ')}` : ''}`
      };
    }

    if (action === 'get') {
      let slot = await client.getSlot(appName, slotName!);
      let mapped = {
        slotName: slot.name?.split('/')?.pop() || slot.name,
        resourceId: slot.id,
        state: slot.properties?.state,
        defaultHostName: slot.properties?.defaultHostName
      };

      return {
        output: { slot: mapped, action, success: true },
        message: `Slot **${mapped.slotName}** is **${mapped.state || 'unknown'}** at \`${mapped.defaultHostName}\`.`
      };
    }

    if (action === 'create') {
      let app = await client.getFunctionApp(appName);
      let slotBody = {
        location: location || app.location,
        properties: {}
      };
      let created = await client.createOrUpdateSlot(appName, slotName!, slotBody);
      let mapped = {
        slotName: created.name?.split('/')?.pop() || created.name,
        resourceId: created.id,
        state: created.properties?.state,
        defaultHostName: created.properties?.defaultHostName
      };

      return {
        output: { slot: mapped, action, success: true },
        message: `Created deployment slot **${mapped.slotName}** for **${appName}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteSlot(appName, slotName!);
      return {
        output: { action, success: true },
        message: `Deleted deployment slot **${slotName}** from **${appName}**.`
      };
    }

    // swap
    if (targetSlotName === 'production') {
      await client.swapSlotWithProduction(appName, slotName!);
    } else {
      await client.swapSlots(appName, slotName!, targetSlotName!);
    }

    return {
      output: { action, success: true },
      message: `Swapped slot **${slotName}** with **${targetSlotName}** for **${appName}**.`
    };
  })
  .build();
