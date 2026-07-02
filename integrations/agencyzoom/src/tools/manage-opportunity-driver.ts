import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageOpportunityDriver = SlateTool.create(spec, {
  name: 'Manage Opportunity Driver',
  key: 'manage_opportunity_driver',
  description: `Add, update, or remove a driver on an opportunity in AgencyZoom. Manage driver details such as name, birthday, gender, marital status, and license number for auto insurance opportunities.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      opportunityId: z.string().describe('ID of the opportunity the driver belongs to'),
      action: z
        .enum(['create', 'update', 'delete'])
        .describe('Action to perform on the driver'),
      driverId: z
        .string()
        .optional()
        .describe('ID of the driver (required for "update" and "delete" actions)'),
      firstName: z.string().optional().describe('Driver first name'),
      lastName: z.string().optional().describe('Driver last name'),
      birthday: z
        .string()
        .optional()
        .describe('Driver date of birth (ISO date string, e.g. "1990-05-15")'),
      gender: z.string().optional().describe('Driver gender'),
      maritalStatus: z.string().optional().describe('Driver marital status'),
      licenseNumber: z.string().optional().describe('Driver license number')
    })
  )
  .output(
    z.object({
      driver: z
        .record(z.string(), z.any())
        .optional()
        .describe('Driver data (for "create" and "update" actions)'),
      success: z
        .boolean()
        .optional()
        .describe('Whether the operation succeeded (for "delete" action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    switch (ctx.input.action) {
      case 'create': {
        let data: Record<string, any> = {};
        if (ctx.input.firstName !== undefined) data.firstName = ctx.input.firstName;
        if (ctx.input.lastName !== undefined) data.lastName = ctx.input.lastName;
        if (ctx.input.birthday !== undefined) data.birthday = ctx.input.birthday;
        if (ctx.input.gender !== undefined) data.gender = ctx.input.gender;
        if (ctx.input.maritalStatus !== undefined)
          data.maritalStatus = ctx.input.maritalStatus;
        if (ctx.input.licenseNumber !== undefined)
          data.licenseNumber = ctx.input.licenseNumber;

        let result = await client.createOpportunityDriver(ctx.input.opportunityId, data);
        return {
          output: { driver: result },
          message: `Added driver${ctx.input.firstName ? ` **${ctx.input.firstName}${ctx.input.lastName ? ` ${ctx.input.lastName}` : ''}**` : ''} to opportunity **${ctx.input.opportunityId}**.`
        };
      }
      case 'update': {
        if (!ctx.input.driverId) {
          throw new Error('driverId is required for "update" action');
        }
        let data: Record<string, any> = {};
        if (ctx.input.firstName !== undefined) data.firstName = ctx.input.firstName;
        if (ctx.input.lastName !== undefined) data.lastName = ctx.input.lastName;
        if (ctx.input.birthday !== undefined) data.birthday = ctx.input.birthday;
        if (ctx.input.gender !== undefined) data.gender = ctx.input.gender;
        if (ctx.input.maritalStatus !== undefined)
          data.maritalStatus = ctx.input.maritalStatus;
        if (ctx.input.licenseNumber !== undefined)
          data.licenseNumber = ctx.input.licenseNumber;

        let result = await client.updateOpportunityDriver(
          ctx.input.opportunityId,
          ctx.input.driverId,
          data
        );
        return {
          output: { driver: result },
          message: `Updated driver **${ctx.input.driverId}** on opportunity **${ctx.input.opportunityId}**.`
        };
      }
      case 'delete': {
        if (!ctx.input.driverId) {
          throw new Error('driverId is required for "delete" action');
        }
        await client.deleteOpportunityDriver(ctx.input.opportunityId, ctx.input.driverId);
        return {
          output: { success: true },
          message: `Removed driver **${ctx.input.driverId}** from opportunity **${ctx.input.opportunityId}**.`
        };
      }
    }
  })
  .build();
