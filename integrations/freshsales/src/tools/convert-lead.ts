import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let convertLead = SlateTool.create(spec, {
  name: 'Convert Lead',
  key: 'convert_lead',
  description: `Convert a lead to a contact in Freshsales. Requires the lead's last name and company name for conversion.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      leadId: z.number().describe('ID of the lead to convert'),
      lastName: z.string().describe('Last name (required for conversion)'),
      companyName: z.string().describe('Company name (required for conversion)')
    })
  )
  .output(
    z.object({
      contactId: z.number().optional().describe('ID of the created contact'),
      accountId: z.number().optional().describe('ID of the created or associated account'),
      dealId: z.number().optional().describe('ID of the created deal, if any')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.convertLead(ctx.input.leadId, {
      last_name: ctx.input.lastName,
      company: { name: ctx.input.companyName }
    });

    return {
      output: {
        contactId: result.contact?.id,
        accountId: result.sales_account?.id,
        dealId: result.deal?.id
      },
      message: `Lead **${ctx.input.leadId}** converted to contact${result.contact?.id ? ` (ID: ${result.contact.id})` : ''}.`
    };
  })
  .build();
