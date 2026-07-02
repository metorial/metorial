import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageOpportunityVehicle = SlateTool.create(spec, {
  name: 'Manage Opportunity Vehicle',
  key: 'manage_opportunity_vehicle',
  description: `Add, update, or remove a vehicle on an opportunity in AgencyZoom. Manage vehicle details such as VIN, make, model, year, and ownership type for auto insurance opportunities.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      opportunityId: z.string().describe('ID of the opportunity the vehicle belongs to'),
      action: z
        .enum(['create', 'update', 'delete'])
        .describe('Action to perform on the vehicle'),
      vehicleId: z
        .string()
        .optional()
        .describe('ID of the vehicle (required for "update" and "delete" actions)'),
      vin: z.string().optional().describe('Vehicle Identification Number (VIN)'),
      make: z.string().optional().describe('Vehicle make (e.g. "Toyota", "Ford")'),
      model: z.string().optional().describe('Vehicle model (e.g. "Camry", "F-150")'),
      year: z.number().optional().describe('Vehicle model year (e.g. 2024)'),
      ownershipType: z
        .string()
        .optional()
        .describe('Vehicle ownership type (e.g. "owned", "leased", "financed")')
    })
  )
  .output(
    z.object({
      vehicle: z
        .record(z.string(), z.any())
        .optional()
        .describe('Vehicle data (for "create" and "update" actions)'),
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
        if (ctx.input.vin !== undefined) data.vin = ctx.input.vin;
        if (ctx.input.make !== undefined) data.make = ctx.input.make;
        if (ctx.input.model !== undefined) data.model = ctx.input.model;
        if (ctx.input.year !== undefined) data.year = ctx.input.year;
        if (ctx.input.ownershipType !== undefined)
          data.ownershipType = ctx.input.ownershipType;

        let result = await client.createOpportunityVehicle(ctx.input.opportunityId, data);
        return {
          output: { vehicle: result },
          message: `Added vehicle${ctx.input.make ? ` **${ctx.input.year ? `${ctx.input.year} ` : ''}${ctx.input.make}${ctx.input.model ? ` ${ctx.input.model}` : ''}**` : ''} to opportunity **${ctx.input.opportunityId}**.`
        };
      }
      case 'update': {
        if (!ctx.input.vehicleId) {
          throw new Error('vehicleId is required for "update" action');
        }
        let data: Record<string, any> = {};
        if (ctx.input.vin !== undefined) data.vin = ctx.input.vin;
        if (ctx.input.make !== undefined) data.make = ctx.input.make;
        if (ctx.input.model !== undefined) data.model = ctx.input.model;
        if (ctx.input.year !== undefined) data.year = ctx.input.year;
        if (ctx.input.ownershipType !== undefined)
          data.ownershipType = ctx.input.ownershipType;

        let result = await client.updateOpportunityVehicle(
          ctx.input.opportunityId,
          ctx.input.vehicleId,
          data
        );
        return {
          output: { vehicle: result },
          message: `Updated vehicle **${ctx.input.vehicleId}** on opportunity **${ctx.input.opportunityId}**.`
        };
      }
      case 'delete': {
        if (!ctx.input.vehicleId) {
          throw new Error('vehicleId is required for "delete" action');
        }
        await client.deleteOpportunityVehicle(ctx.input.opportunityId, ctx.input.vehicleId);
        return {
          output: { success: true },
          message: `Removed vehicle **${ctx.input.vehicleId}** from opportunity **${ctx.input.opportunityId}**.`
        };
      }
    }
  })
  .build();
