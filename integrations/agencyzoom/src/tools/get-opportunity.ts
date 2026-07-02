import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getOpportunity = SlateTool.create(spec, {
  name: 'Get Opportunity',
  key: 'get_opportunity',
  description: `Get details of an opportunity in AgencyZoom. Optionally include associated drivers and vehicles. Useful for viewing auto insurance opportunity details with driver and vehicle information.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      opportunityId: z.string().describe('ID of the opportunity to retrieve'),
      includeDrivers: z
        .boolean()
        .optional()
        .describe('Whether to include associated drivers in the response'),
      includeVehicles: z
        .boolean()
        .optional()
        .describe('Whether to include associated vehicles in the response')
    })
  )
  .output(
    z.object({
      opportunity: z.record(z.string(), z.any()).describe('Opportunity detail data'),
      drivers: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Array of drivers associated with the opportunity'),
      vehicles: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Array of vehicles associated with the opportunity')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let opportunity = await client.getOpportunity(ctx.input.opportunityId);

    let drivers: Record<string, any>[] | undefined;
    let vehicles: Record<string, any>[] | undefined;

    if (ctx.input.includeDrivers) {
      let driversResult = await client.getOpportunityDrivers(ctx.input.opportunityId);
      drivers = Array.isArray(driversResult)
        ? driversResult
        : (driversResult.data ?? driversResult.drivers ?? []);
    }

    if (ctx.input.includeVehicles) {
      let vehiclesResult = await client.getOpportunityVehicles(ctx.input.opportunityId);
      vehicles = Array.isArray(vehiclesResult)
        ? vehiclesResult
        : (vehiclesResult.data ?? vehiclesResult.vehicles ?? []);
    }

    let parts: string[] = [`Retrieved opportunity **${ctx.input.opportunityId}**`];
    if (drivers) parts.push(`with **${drivers.length}** driver(s)`);
    if (vehicles) parts.push(`and **${vehicles.length}** vehicle(s)`);

    return {
      output: { opportunity, drivers, vehicles },
      message: `${parts.join(' ')}.`
    };
  })
  .build();
