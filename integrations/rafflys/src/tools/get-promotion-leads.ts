import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPromotionLeadsTool = SlateTool.create(spec, {
  name: 'Get Promotion Leads',
  key: 'get_promotion_leads',
  description: `Retrieve all leads collected from a specific Rafflys promotion (giveaway, fortune wheel, or contest). Returns lead details including contact information and registration timestamps. Use the **List Promotions** tool first to find the promotion ID.`,
  instructions: [
    'Provide the promotion ID to fetch leads for. Use the List Promotions tool to discover available promotion IDs.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      promotionId: z.string().describe('ID of the promotion to fetch leads for')
    })
  )
  .output(
    z.object({
      leads: z
        .array(
          z.object({
            leadId: z.string().describe('Unique identifier of the lead'),
            createdAt: z
              .string()
              .optional()
              .describe('ISO 8601 timestamp when the lead was captured'),
            email: z.string().optional().describe('Email address of the lead'),
            firstName: z.string().optional().describe('First name of the lead'),
            lastName: z.string().optional().describe('Last name of the lead'),
            fullName: z.string().optional().describe('Full name of the lead'),
            phone: z.string().optional().describe('Phone number of the lead'),
            additionalFields: z
              .record(z.string(), z.unknown())
              .optional()
              .describe('Any additional custom fields from the lead form')
          })
        )
        .describe('List of leads collected from the promotion')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let leads = await client.getPromotionLeads(ctx.input.promotionId);

    let mapped = leads.map(lead => {
      let { id, created, email, firstName, lastName, fullName, phone, ...rest } = lead;
      return {
        leadId: id?.toString(),
        createdAt: created,
        email,
        firstName,
        lastName,
        fullName,
        phone,
        additionalFields:
          Object.keys(rest).length > 0 ? (rest as Record<string, unknown>) : undefined
      };
    });

    return {
      output: {
        leads: mapped
      },
      message: `Retrieved **${mapped.length}** lead(s) from promotion \`${ctx.input.promotionId}\`.`
    };
  })
  .build();
