import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageProspecting = SlateTool.create(spec, {
  name: 'Manage Prospecting',
  key: 'manage_prospecting',
  description: `Manage prospecting lists and prospects. Create prospecting lists, add/update/delete prospects, search prospects by email or field values, and convert prospects into leads. Use the "action" field to specify the operation.`,
  instructions: [
    'Use "list_lists" to list all prospecting lists.',
    'Use "create_list" to create a new prospecting list.',
    'Use "add_prospects" to add prospects to a list. Provide prospectFields as an array of field objects.',
    'Use "update_prospect" to update a prospect\'s fields.',
    'Use "delete_prospect" to remove a prospect from a list.',
    'Use "find_prospects" to search for prospects by email or custom field.',
    'Use "convert_to_lead" to convert a prospect into a lead.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list_lists',
          'get_list',
          'create_list',
          'add_prospects',
          'update_prospect',
          'delete_prospect',
          'find_prospects',
          'convert_to_lead'
        ])
        .describe('Operation to perform'),
      prospectingListId: z.number().optional().describe('Prospecting list ID'),
      prospectId: z
        .number()
        .optional()
        .describe('Prospect ID (for update, delete, convert_to_lead)'),
      name: z.string().optional().describe('List name (for create_list)'),
      description: z.string().optional().describe('List description (for create_list)'),
      prospectFields: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Array of prospect field objects to add (for add_prospects)'),
      fields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Fields to update on a prospect (for update_prospect)'),
      email: z.string().optional().describe('Email to search for (for find_prospects)'),
      fieldName: z
        .string()
        .optional()
        .describe('Field name to search by (for find_prospects)'),
      fieldValue: z
        .string()
        .optional()
        .describe('Field value to search for (for find_prospects)'),
      userId: z
        .number()
        .optional()
        .describe('User ID to assign the new lead to (for convert_to_lead)')
    })
  )
  .output(
    z.object({
      prospectingLists: z
        .array(
          z.object({
            prospectingListId: z.number().describe('List ID'),
            name: z.string().describe('List name'),
            description: z.string().optional().describe('List description')
          })
        )
        .optional()
        .describe('Prospecting lists'),
      prospectingList: z
        .object({
          prospectingListId: z.number().describe('List ID'),
          name: z.string().describe('List name'),
          description: z.string().optional().describe('List description')
        })
        .optional()
        .describe('Single prospecting list'),
      prospects: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Prospects found or added'),
      prospect: z.record(z.string(), z.any()).optional().describe('Single prospect'),
      lead: z
        .object({
          leadId: z.number().describe('New lead ID'),
          title: z.string().describe('Lead title')
        })
        .optional()
        .describe('Lead created from prospect conversion'),
      deleted: z.boolean().optional().describe('Whether the prospect was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    if (ctx.input.action === 'list_lists') {
      let lists = await client.listProspectingLists();
      return {
        output: {
          prospectingLists: lists.map((l: any) => ({
            prospectingListId: l.id,
            name: l.name,
            description: l.description
          }))
        },
        message: `Found **${lists.length}** prospecting lists.`
      };
    }

    if (ctx.input.action === 'get_list') {
      if (!ctx.input.prospectingListId) throw new Error('prospectingListId is required');
      let list = await client.getProspectingList(ctx.input.prospectingListId);
      return {
        output: {
          prospectingList: {
            prospectingListId: list.id,
            name: list.name,
            description: list.description
          }
        },
        message: `Retrieved prospecting list **"${list.name}"** (ID: ${list.id}).`
      };
    }

    if (ctx.input.action === 'create_list') {
      if (!ctx.input.name) throw new Error('name is required for create_list');
      let list = await client.createProspectingList({
        name: ctx.input.name,
        description: ctx.input.description
      });
      return {
        output: {
          prospectingList: {
            prospectingListId: list.id,
            name: list.name,
            description: list.description
          }
        },
        message: `Created prospecting list **"${list.name}"** (ID: ${list.id}).`
      };
    }

    if (ctx.input.action === 'add_prospects') {
      if (!ctx.input.prospectingListId) throw new Error('prospectingListId is required');
      if (!ctx.input.prospectFields || ctx.input.prospectFields.length === 0)
        throw new Error('prospectFields is required');
      let result = await client.addProspects(
        ctx.input.prospectingListId,
        ctx.input.prospectFields
      );
      return {
        output: { prospects: Array.isArray(result) ? result : [result] },
        message: `Added **${ctx.input.prospectFields.length}** prospects to list ${ctx.input.prospectingListId}.`
      };
    }

    if (ctx.input.action === 'update_prospect') {
      if (!ctx.input.prospectingListId) throw new Error('prospectingListId is required');
      if (!ctx.input.prospectId) throw new Error('prospectId is required');
      if (!ctx.input.fields) throw new Error('fields is required');
      let result = await client.updateProspect(
        ctx.input.prospectingListId,
        ctx.input.prospectId,
        ctx.input.fields
      );
      return {
        output: { prospect: result },
        message: `Updated prospect ${ctx.input.prospectId} in list ${ctx.input.prospectingListId}.`
      };
    }

    if (ctx.input.action === 'delete_prospect') {
      if (!ctx.input.prospectingListId) throw new Error('prospectingListId is required');
      if (!ctx.input.prospectId) throw new Error('prospectId is required');
      await client.deleteProspect(ctx.input.prospectingListId, ctx.input.prospectId);
      return {
        output: { deleted: true },
        message: `Deleted prospect ${ctx.input.prospectId} from list ${ctx.input.prospectingListId}.`
      };
    }

    if (ctx.input.action === 'find_prospects') {
      let results = await client.findProspects({
        email: ctx.input.email,
        fieldName: ctx.input.fieldName,
        fieldValue: ctx.input.fieldValue
      });
      return {
        output: { prospects: results },
        message: `Found **${results.length}** matching prospects.`
      };
    }

    if (ctx.input.action === 'convert_to_lead') {
      if (!ctx.input.prospectingListId) throw new Error('prospectingListId is required');
      if (!ctx.input.prospectId) throw new Error('prospectId is required');
      let lead = await client.convertProspectToLead(
        ctx.input.prospectingListId,
        ctx.input.prospectId,
        ctx.input.userId
      );
      return {
        output: {
          lead: {
            leadId: lead.id,
            title: lead.title
          }
        },
        message: `Converted prospect ${ctx.input.prospectId} to lead **"${lead.title}"** (ID: ${lead.id}).`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
