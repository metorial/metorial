import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let convertLead = SlateTool.create(spec, {
  name: 'Convert Lead',
  key: 'convert_lead',
  description: `Convert a Lead into a Contact, Account, and/or Opportunity in EspoCRM. Optionally associate new Contacts and Opportunities with an existing Account. Lead attributes are copied into new records using the instance's conversion settings.`,
  instructions: [
    'Accounts and Contacts are created by default. Set createAccount or createContact to false to omit them; Opportunities are only created when requested.',
    'If accountId is provided, no new Account is created. The existing Account is associated through a newly created Contact or Opportunity.'
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
    let createAccount = ctx.input.createAccount !== false && !ctx.input.accountId;
    let createContact = ctx.input.createContact !== false;
    let createOpportunity = ctx.input.createOpportunity === true;

    if (!createAccount && !createContact && !createOpportunity) {
      throw createApiServiceError(
        'Select at least one record type to create when converting the lead. An existing accountId requires a new Contact or Opportunity.'
      );
    }

    let defaults = await client.getLeadConversionAttributes(ctx.input.leadId);
    for (let entityType of [
      ...(createAccount ? ['Account'] : []),
      ...(createContact ? ['Contact'] : []),
      ...(createOpportunity ? ['Opportunity'] : [])
    ]) {
      if (!defaults[entityType]) {
        throw createApiServiceError(
          `EspoCRM cannot prepare ${entityType} conversion. Check create permissions and the instance's lead conversion settings.`
        );
      }
    }

    if (createAccount) {
      records.Account = { ...defaults.Account };
    }

    if (createContact) {
      records.Contact = { ...defaults.Contact };
      if (ctx.input.accountId) records.Contact.accountId = ctx.input.accountId;
    }

    if (createOpportunity) {
      let oppData: Record<string, any> = { ...defaults.Opportunity };
      if (ctx.input.accountId) oppData.accountId = ctx.input.accountId;
      if (ctx.input.opportunityName !== undefined) oppData.name = ctx.input.opportunityName;
      if (ctx.input.opportunityStage !== undefined) oppData.stage = ctx.input.opportunityStage;
      if (ctx.input.opportunityAmount !== undefined)
        oppData.amount = ctx.input.opportunityAmount;
      if (ctx.input.opportunityCloseDate !== undefined)
        oppData.closeDate = ctx.input.opportunityCloseDate;
      records.Opportunity = oppData;
    }

    let result = await client.convertLead(ctx.input.leadId, records);

    return {
      output: {
        leadId: ctx.input.leadId,
        accountId:
          result.createdAccountId ||
          result.accountId ||
          result.Account?.id ||
          ctx.input.accountId,
        contactId: result.createdContactId || result.contactId || result.Contact?.id,
        opportunityId:
          result.createdOpportunityId || result.opportunityId || result.Opportunity?.id
      },
      message: `Lead **${ctx.input.leadId}** converted successfully.`
    };
  })
  .build();
