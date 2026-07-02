import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchContractVehicles = SlateTool.create(spec, {
  name: 'Search Contract Vehicles',
  key: 'search_contract_vehicles',
  description: `Search 4K+ federal multi-award contract vehicles including GSA Schedules, GWACs, BPAs, and other vehicles. Look up a specific vehicle by key or browse the full list. Useful for identifying vehicle opportunities and analyzing contract vehicle usage.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      vehicleKey: z
        .number()
        .optional()
        .describe('HigherGov vehicle key to look up a specific contract vehicle'),
      ordering: z
        .enum(['award_date', '-award_date'])
        .optional()
        .describe('Sort order for results'),
      pageNumber: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (max 100, default 10)')
    })
  )
  .output(
    z.object({
      vehicles: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of contract vehicle records'),
      totalCount: z.number().describe('Total number of matching vehicles'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let response = await client.getVehicles({
      vehicleKey: ctx.input.vehicleKey,
      ordering: ctx.input.ordering,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        vehicles: response.results,
        totalCount: response.meta.pagination.count,
        currentPage: response.meta.pagination.page,
        totalPages: response.meta.pagination.pages
      },
      message: `Found **${response.meta.pagination.count}** contract vehicles (page ${response.meta.pagination.page} of ${response.meta.pagination.pages}). Returned **${response.results.length}** results.`
    };
  })
  .build();
