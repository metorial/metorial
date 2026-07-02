import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchSalesforce = SlateTool.create(spec, {
  name: 'Search Salesforce',
  key: 'search_salesforce',
  description: `Search Salesforce records through Mixmax. Requires a connected Salesforce account. Can also look up a contact or lead by email address.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query for Salesforce records'),
      email: z
        .string()
        .optional()
        .describe('Email address to look up a specific contact or lead')
    })
  )
  .output(
    z.object({
      results: z.array(z.any()).describe('Salesforce search results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let results: any[];

    if (ctx.input.email) {
      let data = await client.getSalesforceContactOrLead(ctx.input.email);
      results = Array.isArray(data) ? data : [data];
    } else if (ctx.input.query) {
      let data = await client.searchSalesforce(ctx.input.query);
      results = data.results || data || [];
    } else {
      throw new Error('Either query or email must be provided');
    }

    return {
      output: { results },
      message: `Found ${results.length} Salesforce record(s).`
    };
  })
  .build();

export let manageSalesforceRecord = SlateTool.create(spec, {
  name: 'Manage Salesforce Record',
  key: 'manage_salesforce_record',
  description: `Create or update a Salesforce record (account, contact, lead, opportunity, or task) through Mixmax. Requires a connected Salesforce account.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update']).describe('Whether to create or update the record'),
      objectType: z
        .enum(['account', 'contact', 'lead', 'opportunity', 'task'])
        .describe('Salesforce object type'),
      recordId: z.string().optional().describe('Record ID (required for update)'),
      fields: z.record(z.string(), z.any()).describe('Record fields to set')
    })
  )
  .output(
    z.object({
      recordId: z.string().optional().describe('Salesforce record ID'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      let result = await client.createSalesforceRecord(ctx.input.objectType, ctx.input.fields);
      return {
        output: {
          recordId: result._id || result.id,
          success: true
        },
        message: `Salesforce ${ctx.input.objectType} created.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.recordId) throw new Error('recordId is required for update');
      await client.updateSalesforceRecord(
        ctx.input.objectType,
        ctx.input.recordId,
        ctx.input.fields
      );
      return {
        output: {
          recordId: ctx.input.recordId,
          success: true
        },
        message: `Salesforce ${ctx.input.objectType} ${ctx.input.recordId} updated.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
