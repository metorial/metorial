import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let convertLead = SlateTool.create(spec, {
  name: 'Convert Lead',
  key: 'convert_lead',
  description: `Convert a Lead into a Contact, Account, and/or Opportunity in EspoCRM. Optionally specify an existing Account or Contact to link to, or provide details for new records to be created.`,
  instructions: [
    'At least one of createAccount, createContact, or createOpportunity should be provided.',
    'If an existing accountId is provided, the lead will be linked to that account instead of creating a new one.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      leadId: z.string().describe('ID of the lead to convert'),
      createAccount: z
        .boolean()
        .optional()
        .describe('Whether to create an Account from the lead'),
      createContact: z
        .boolean()
        .optional()
        .describe('Whether to create a Contact from the lead'),
      createOpportunity: z
        .boolean()
        .optional()
        .describe('Whether to create an Opportunity from the lead'),
      accountId: z
        .string()
        .optional()
        .describe('ID of an existing Account to associate (instead of creating a new one)'),
      opportunityName: z.string().optional().describe('Name for the new Opportunity'),
      opportunityStage: z.string().optional().describe('Stage for the new Opportunity'),
      opportunityAmount: z.number().optional().describe('Amount for the new Opportunity'),
      opportunityCloseDate: z
        .string()
        .optional()
        .describe('Close date for the new Opportunity (YYYY-MM-DD)')
    })
  )
  .output(
    z.object({
      leadId: z.string().describe('ID of the converted lead'),
      accountId: z.string().optional().describe('ID of the created/linked Account'),
      contactId: z.string().optional().describe('ID of the created Contact'),
      opportunityId: z.string().optional().describe('ID of the created Opportunity')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let records: Record<string, any> = {};

    if (ctx.input.createAccount !== false) {
      if (ctx.input.accountId) {
        records.Account = ctx.input.accountId;
      } else {
        records.Account = true;
      }
    }

    if (ctx.input.createContact !== false) {
      records.Contact = true;
    }

    if (ctx.input.createOpportunity) {
      let oppData: Record<string, any> = {};
      if (ctx.input.opportunityName) oppData.name = ctx.input.opportunityName;
      if (ctx.input.opportunityStage) oppData.stage = ctx.input.opportunityStage;
      if (ctx.input.opportunityAmount) oppData.amount = ctx.input.opportunityAmount;
      if (ctx.input.opportunityCloseDate) oppData.closeDate = ctx.input.opportunityCloseDate;
      records.Opportunity = Object.keys(oppData).length > 0 ? oppData : true;
    }

    let result = await client.convertLead(ctx.input.leadId, records);

    return {
      output: {
        leadId: ctx.input.leadId,
        accountId: result.accountId || result.Account?.id,
        contactId: result.contactId || result.Contact?.id,
        opportunityId: result.opportunityId || result.Opportunity?.id
      },
      message: `Lead **${ctx.input.leadId}** converted successfully.`
    };
  })
  .build();
