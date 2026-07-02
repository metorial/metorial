import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageLeads = SlateTool.create(spec, {
  name: 'Manage Leads',
  key: 'manage_leads',
  description: `Create, update, or delete Lead records in EspoCRM. Leads represent potential customers who have shown interest but have not yet been qualified.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete'])
        .describe('Operation to perform on the lead'),
      leadId: z.string().optional().describe('Lead ID (required for update and delete)'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      emailAddress: z.string().optional().describe('Primary email address'),
      phoneNumber: z.string().optional().describe('Primary phone number'),
      accountName: z.string().optional().describe('Company/account name'),
      title: z.string().optional().describe('Job title'),
      status: z
        .string()
        .optional()
        .describe('Lead status (e.g., New, Assigned, In Process, Converted, Dead)'),
      source: z.string().optional().describe('Lead source (e.g., Web, Phone, Email)'),
      industry: z.string().optional().describe('Industry'),
      description: z.string().optional().describe('Description or notes'),
      assignedUserId: z.string().optional().describe('ID of the assigned user'),
      addressStreet: z.string().optional().describe('Street address'),
      addressCity: z.string().optional().describe('City'),
      addressState: z.string().optional().describe('State or region'),
      addressCountry: z.string().optional().describe('Country'),
      addressPostalCode: z.string().optional().describe('Postal code'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional custom fields as key-value pairs')
    })
  )
  .output(
    z.object({
      leadId: z.string().describe('ID of the lead'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      emailAddress: z.string().optional().describe('Primary email address'),
      phoneNumber: z.string().optional().describe('Primary phone number'),
      status: z.string().optional().describe('Lead status'),
      source: z.string().optional().describe('Lead source'),
      accountName: z.string().optional().describe('Company name'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      modifiedAt: z.string().optional().describe('Last modification timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action, leadId, customFields, ...fields } = ctx.input;

    if (action === 'create') {
      let data: Record<string, any> = { ...fields, ...customFields };
      let result = await client.createRecord('Lead', data);
      return {
        output: {
          leadId: result.id,
          firstName: result.firstName,
          lastName: result.lastName,
          emailAddress: result.emailAddress,
          phoneNumber: result.phoneNumber,
          status: result.status,
          source: result.source,
          accountName: result.accountName,
          createdAt: result.createdAt,
          modifiedAt: result.modifiedAt
        },
        message: `Lead **${result.firstName || ''} ${result.lastName || ''}** created successfully.`
      };
    }

    if (action === 'update') {
      if (!leadId) throw new Error('leadId is required for update');
      let data: Record<string, any> = { ...fields, ...customFields };
      Object.keys(data).forEach(key => {
        if (data[key] === undefined) delete data[key];
      });
      let result = await client.updateRecord('Lead', leadId, data);
      return {
        output: {
          leadId: result.id,
          firstName: result.firstName,
          lastName: result.lastName,
          emailAddress: result.emailAddress,
          phoneNumber: result.phoneNumber,
          status: result.status,
          source: result.source,
          accountName: result.accountName,
          createdAt: result.createdAt,
          modifiedAt: result.modifiedAt
        },
        message: `Lead **${result.firstName || ''} ${result.lastName || ''}** updated successfully.`
      };
    }

    if (action === 'delete') {
      if (!leadId) throw new Error('leadId is required for delete');
      await client.deleteRecord('Lead', leadId);
      return {
        output: {
          leadId
        },
        message: `Lead **${leadId}** deleted successfully.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
