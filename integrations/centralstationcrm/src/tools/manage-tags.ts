import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTags = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `Add or remove tags on people, companies, or deals in CentralStationCRM. Tags help categorize and filter records by criteria like industry, area, or channel.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['add', 'remove']).describe('Whether to add or remove a tag'),
      resourceType: z.enum(['person', 'company', 'deal']).describe('Type of resource to tag'),
      resourceId: z.number().describe('ID of the person, company, or deal'),
      tagName: z
        .string()
        .optional()
        .describe('Name of the tag to add (required when action is "add")'),
      tagId: z
        .number()
        .optional()
        .describe('ID of the tag to remove (required when action is "remove")')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful'),
      tagId: z.number().optional().describe('ID of the tag that was added or removed'),
      tagName: z.string().optional().describe('Name of the tag')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    if (ctx.input.action === 'add') {
      if (!ctx.input.tagName) {
        throw new Error('tagName is required when adding a tag');
      }

      let result: any;
      if (ctx.input.resourceType === 'person') {
        result = await client.addPersonTag(ctx.input.resourceId, { name: ctx.input.tagName });
      } else if (ctx.input.resourceType === 'company') {
        result = await client.addCompanyTag(ctx.input.resourceId, { name: ctx.input.tagName });
      } else {
        result = await client.addDealTag(ctx.input.resourceId, { name: ctx.input.tagName });
      }

      let tag = result?.tag ?? result;

      return {
        output: {
          success: true,
          tagId: tag?.id,
          tagName: tag?.name ?? ctx.input.tagName
        },
        message: `Added tag **${ctx.input.tagName}** to ${ctx.input.resourceType} (ID: ${ctx.input.resourceId}).`
      };
    } else {
      if (!ctx.input.tagId) {
        throw new Error('tagId is required when removing a tag');
      }

      if (ctx.input.resourceType === 'person') {
        await client.removePersonTag(ctx.input.resourceId, ctx.input.tagId);
      } else if (ctx.input.resourceType === 'company') {
        await client.removeCompanyTag(ctx.input.resourceId, ctx.input.tagId);
      } else {
        await client.removeDealTag(ctx.input.resourceId, ctx.input.tagId);
      }

      return {
        output: {
          success: true,
          tagId: ctx.input.tagId,
          tagName: undefined
        },
        message: `Removed tag (ID: ${ctx.input.tagId}) from ${ctx.input.resourceType} (ID: ${ctx.input.resourceId}).`
      };
    }
  })
  .build();
