import { SlateTool } from 'slates';
import { z } from 'zod';
import { MagneticClient } from '../lib/client';
import { spec } from '../spec';

export let createOpportunity = SlateTool.create(spec, {
  name: 'Create Opportunity/Job',
  key: 'create_opportunity',
  description: `Create a new opportunity or job in the Magnetic CRM pipeline. Opportunities can be assigned to an owner and linked to a contact and company.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the opportunity or job'),
      description: z
        .string()
        .optional()
        .describe('Description or extra details about the opportunity'),
      ownerId: z.string().describe('User ID of the opportunity owner'),
      contactId: z.string().optional().describe('ID of the associated contact'),
      companyId: z.string().optional().describe('ID of the associated company'),
      amount: z.number().optional().describe('Monetary amount/value of the opportunity'),
      dueDate: z.string().optional().describe('Due date in ISO 8601 format'),
      tags: z.string().optional().describe('Comma-separated tags for the opportunity'),
      externalRef: z.string().optional().describe('External reference identifier')
    })
  )
  .output(
    z.object({
      opportunityId: z.string().describe('ID of the created opportunity/job'),
      name: z.string().optional().describe('Name of the opportunity/job')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MagneticClient({ token: ctx.auth.token });

    let data: Record<string, any> = {
      name: ctx.input.name,
      extra: ctx.input.description,
      owner: { id: ctx.input.ownerId },
      amount: ctx.input.amount,
      dueDate: ctx.input.dueDate,
      tags: ctx.input.tags,
      externalRef: ctx.input.externalRef
    };

    if (ctx.input.contactId) {
      data.contact = { id: ctx.input.contactId };
    }

    if (ctx.input.companyId) {
      data.contactCompany = { id: ctx.input.companyId };
    }

    let response = await client.createGrouping(data);

    return {
      output: {
        opportunityId: String(response.id),
        name: response.name
      },
      message: `Created opportunity **${response.name || ctx.input.name}** (ID: ${response.id}).`
    };
  })
  .build();
