import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getBaseUrl } from '../lib/helpers';
import { spec } from '../spec';

export let manageContractor = SlateTool.create(spec, {
  name: 'Manage Contractor',
  key: 'manage_contractor',
  description: `Create, retrieve, or update a contractor (1099 worker).
- To **create**: provide companyId, type, and contractor details.
- To **get**: provide contractorId.
- To **update**: provide contractorId and fields to change.`,
  instructions: [
    'For individual contractors, provide firstName and lastName.',
    'For business contractors, provide businessName.',
    'The version field is required for updates (optimistic locking).'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'update']).describe('The action to perform'),
      companyId: z.string().optional().describe('Company UUID (required for create)'),
      contractorId: z
        .string()
        .optional()
        .describe('Contractor UUID (required for get/update)'),
      version: z
        .string()
        .optional()
        .describe('Resource version for optimistic locking (required for update)'),
      type: z.enum(['Individual', 'Business']).optional().describe('Contractor type'),
      firstName: z.string().optional().describe('First name (individual contractors)'),
      lastName: z.string().optional().describe('Last name (individual contractors)'),
      businessName: z.string().optional().describe('Business name (business contractors)'),
      email: z.string().optional().describe('Email address'),
      wageType: z.enum(['Fixed', 'Hourly']).optional().describe('Wage type'),
      startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      ssn: z.string().optional().describe('SSN or EIN for the contractor')
    })
  )
  .output(
    z.object({
      contractorId: z.string().describe('UUID of the contractor'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      businessName: z.string().optional().describe('Business name'),
      email: z.string().optional().describe('Email address'),
      type: z.string().optional().describe('Contractor type'),
      wageType: z.string().optional().describe('Wage type'),
      isActive: z.boolean().optional().describe('Whether the contractor is active'),
      version: z.string().optional().describe('Current resource version')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: getBaseUrl(ctx.auth.environment)
    });

    let result: any;
    let actionMessage: string;

    switch (ctx.input.action) {
      case 'create': {
        if (!ctx.input.companyId)
          throw new Error('companyId is required to create a contractor');
        let data: Record<string, any> = {
          type: ctx.input.type,
          wage_type: ctx.input.wageType,
          start_date: ctx.input.startDate,
          email: ctx.input.email
        };
        if (ctx.input.type === 'Individual') {
          data.first_name = ctx.input.firstName;
          data.last_name = ctx.input.lastName;
          if (ctx.input.ssn) data.ssn = ctx.input.ssn;
        } else {
          data.business_name = ctx.input.businessName;
          if (ctx.input.ssn) data.ein = ctx.input.ssn;
        }
        result = await client.createContractor(ctx.input.companyId, data);
        actionMessage = `Created contractor **${ctx.input.firstName ? `${ctx.input.firstName} ${ctx.input.lastName}` : ctx.input.businessName}**`;
        break;
      }
      case 'get': {
        if (!ctx.input.contractorId) throw new Error('contractorId is required');
        result = await client.getContractor(ctx.input.contractorId);
        actionMessage = `Retrieved contractor **${result.first_name || result.business_name}**`;
        break;
      }
      case 'update': {
        if (!ctx.input.contractorId) throw new Error('contractorId is required for update');
        let updateData: Record<string, any> = {};
        if (ctx.input.version) updateData.version = ctx.input.version;
        if (ctx.input.firstName) updateData.first_name = ctx.input.firstName;
        if (ctx.input.lastName) updateData.last_name = ctx.input.lastName;
        if (ctx.input.businessName) updateData.business_name = ctx.input.businessName;
        if (ctx.input.email) updateData.email = ctx.input.email;
        if (ctx.input.wageType) updateData.wage_type = ctx.input.wageType;
        result = await client.updateContractor(ctx.input.contractorId, updateData);
        actionMessage = `Updated contractor ${ctx.input.contractorId}`;
        break;
      }
    }

    return {
      output: {
        contractorId: result.uuid || result.id?.toString(),
        firstName: result.first_name,
        lastName: result.last_name,
        businessName: result.business_name,
        email: result.email,
        type: result.type,
        wageType: result.wage_type,
        isActive: result.is_active,
        version: result.version
      },
      message: actionMessage
    };
  })
  .build();
