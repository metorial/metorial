import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getConstituent = SlateTool.create(spec, {
  name: 'Get Constituent',
  key: 'get_constituent',
  description: `Retrieve a constituent record by ID. Optionally includes related data such as addresses, emails, phones, notes, relationships, constituent codes, and custom fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      constituentId: z.string().describe('System record ID of the constituent.'),
      includeAddresses: z.boolean().optional().describe('Include addresses.'),
      includeEmails: z.boolean().optional().describe('Include email addresses.'),
      includePhones: z.boolean().optional().describe('Include phone numbers.'),
      includeNotes: z.boolean().optional().describe('Include notes.'),
      includeRelationships: z.boolean().optional().describe('Include relationships.'),
      includeConstituentCodes: z.boolean().optional().describe('Include constituent codes.'),
      includeCustomFields: z.boolean().optional().describe('Include custom fields.')
    })
  )
  .output(
    z.object({
      constituent: z.any().describe('The constituent record.'),
      addresses: z.array(z.any()).optional().describe('Constituent addresses.'),
      emailAddresses: z.array(z.any()).optional().describe('Constituent email addresses.'),
      phones: z.array(z.any()).optional().describe('Constituent phone numbers.'),
      notes: z.array(z.any()).optional().describe('Constituent notes.'),
      relationships: z.array(z.any()).optional().describe('Constituent relationships.'),
      constituentCodes: z.array(z.any()).optional().describe('Constituent codes.'),
      customFields: z.array(z.any()).optional().describe('Custom fields.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subscriptionKey: ctx.auth.subscriptionKey
    });

    let constituent = await client.getConstituent(ctx.input.constituentId);

    let output: {
      constituent: any;
      addresses?: any[];
      emailAddresses?: any[];
      phones?: any[];
      notes?: any[];
      relationships?: any[];
      constituentCodes?: any[];
      customFields?: any[];
    } = { constituent };

    if (ctx.input.includeAddresses) {
      let result = await client.listConstituentAddresses(ctx.input.constituentId);
      output.addresses = result?.value || [];
    }
    if (ctx.input.includeEmails) {
      let result = await client.listConstituentEmailAddresses(ctx.input.constituentId);
      output.emailAddresses = result?.value || [];
    }
    if (ctx.input.includePhones) {
      let result = await client.listConstituentPhones(ctx.input.constituentId);
      output.phones = result?.value || [];
    }
    if (ctx.input.includeNotes) {
      let result = await client.listConstituentNotes(ctx.input.constituentId);
      output.notes = result?.value || [];
    }
    if (ctx.input.includeRelationships) {
      let result = await client.listConstituentRelationships(ctx.input.constituentId);
      output.relationships = result?.value || [];
    }
    if (ctx.input.includeConstituentCodes) {
      let result = await client.listConstituentCodes(ctx.input.constituentId);
      output.constituentCodes = result?.value || [];
    }
    if (ctx.input.includeCustomFields) {
      let result = await client.listConstituentCustomFields(ctx.input.constituentId);
      output.customFields = result?.value || [];
    }

    let name =
      constituent?.name ||
      constituent?.first ||
      constituent?.last ||
      `ID ${ctx.input.constituentId}`;

    return {
      output,
      message: `Retrieved constituent **${name}**.`
    };
  })
  .build();
