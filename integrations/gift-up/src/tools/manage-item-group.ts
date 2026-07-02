import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let groupOutputSchema = z
  .object({
    groupId: z.string().describe('Group ID'),
    name: z.string().describe('Group name'),
    description: z.string().nullable().describe('Group description'),
    sortOrder: z.number().nullable().describe('Sort order'),
    autoExpand: z.boolean().nullable().describe('Whether the group auto-expands in checkout')
  })
  .passthrough();

export let manageItemGroup = SlateTool.create(spec, {
  name: 'Create or Update Item Group',
  key: 'manage_item_group',
  description: `Create a new item group or update an existing one. Item groups organize items in the checkout.`,
  instructions: [
    'To create a new group, omit **groupId** and provide at least **name**.',
    'To update an existing group, provide the **groupId** along with the fields to change.'
  ]
})
  .input(
    z.object({
      groupId: z
        .string()
        .optional()
        .describe('Group ID to update (omit to create a new group)'),
      name: z.string().optional().describe('Group name'),
      description: z.string().optional().describe('Group description'),
      sortOrder: z.number().optional().describe('Sort order position'),
      autoExpand: z
        .boolean()
        .optional()
        .describe('Whether the group auto-expands in the checkout')
    })
  )
  .output(groupOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      testMode: ctx.config.testMode
    });

    if (ctx.input.groupId) {
      let patches: Array<{ op: string; path: string; value: any }> = [];
      if (ctx.input.name !== undefined)
        patches.push({ op: 'replace', path: '/name', value: ctx.input.name });
      if (ctx.input.description !== undefined)
        patches.push({ op: 'replace', path: '/description', value: ctx.input.description });
      if (ctx.input.sortOrder !== undefined)
        patches.push({ op: 'replace', path: '/sortorder', value: ctx.input.sortOrder });
      if (ctx.input.autoExpand !== undefined)
        patches.push({ op: 'replace', path: '/autoexpand', value: ctx.input.autoExpand });

      if (patches.length === 0) {
        let group = await client.getGroup(ctx.input.groupId);
        return {
          output: { ...group, groupId: group.id },
          message: 'No fields provided to update.'
        };
      }

      let updated = await client.updateGroup(ctx.input.groupId, patches);
      return {
        output: { ...updated, groupId: updated.id },
        message: `Updated item group **${updated.name}**`
      };
    } else {
      let group = await client.createGroup({
        name: ctx.input.name!,
        description: ctx.input.description,
        sortOrder: ctx.input.sortOrder,
        autoExpand: ctx.input.autoExpand
      });

      return {
        output: { ...group, groupId: group.id },
        message: `Created item group **${group.name}**`
      };
    }
  })
  .build();
