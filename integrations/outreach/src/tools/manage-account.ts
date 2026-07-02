import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  buildRelationship,
  cleanAttributes,
  flattenResource,
  mergeRelationships
} from '../lib/helpers';
import { spec } from '../spec';

export let manageAccount = SlateTool.create(spec, {
  name: 'Manage Account',
  key: 'manage_account',
  description: `Create, update, or delete an account (company) in Outreach.
Use this to manage company records including name, domain, industry, and other account details.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      accountId: z.string().optional().describe('Account ID (required for update/delete)'),
      name: z.string().optional().describe('Account/company name'),
      domain: z.string().optional().describe('Company domain (e.g. example.com)'),
      description: z.string().optional().describe('Account description'),
      industry: z.string().optional().describe('Industry'),
      numberOfEmployees: z.number().optional().describe('Number of employees'),
      website: z.string().optional().describe('Website URL'),
      linkedInUrl: z.string().optional().describe('LinkedIn company URL'),
      locality: z.string().optional().describe('City/locality'),
      tags: z.array(z.string()).optional().describe('Tags to assign'),
      ownerId: z.string().optional().describe('User ID of the account owner'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values as key-value pairs')
    })
  )
  .output(
    z.object({
      accountId: z.string().optional(),
      name: z.string().optional(),
      domain: z.string().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'delete') {
      if (!ctx.input.accountId) throw new Error('accountId is required for delete');
      await client.deleteAccount(ctx.input.accountId);
      return {
        output: { accountId: ctx.input.accountId, deleted: true },
        message: `Account **${ctx.input.accountId}** deleted successfully.`
      };
    }

    let attributes = cleanAttributes({
      name: ctx.input.name,
      domain: ctx.input.domain,
      description: ctx.input.description,
      industry: ctx.input.industry,
      numberOfEmployees: ctx.input.numberOfEmployees,
      websiteUrl: ctx.input.website,
      linkedInUrl: ctx.input.linkedInUrl,
      locality: ctx.input.locality,
      tags: ctx.input.tags,
      ...ctx.input.customFields
    });

    let relationships = mergeRelationships(buildRelationship('owner', ctx.input.ownerId));

    if (ctx.input.action === 'create') {
      let resource = await client.createAccount(attributes, relationships);
      let flat = flattenResource(resource);
      return {
        output: {
          accountId: flat.id,
          name: flat.name,
          domain: flat.domain
        },
        message: `Account **${flat.name}** created with ID ${flat.id}.`
      };
    }

    if (!ctx.input.accountId) throw new Error('accountId is required for update');
    let resource = await client.updateAccount(ctx.input.accountId, attributes, relationships);
    let flat = flattenResource(resource);
    return {
      output: {
        accountId: flat.id,
        name: flat.name,
        domain: flat.domain
      },
      message: `Account **${flat.name}** (${flat.id}) updated successfully.`
    };
  })
  .build();
