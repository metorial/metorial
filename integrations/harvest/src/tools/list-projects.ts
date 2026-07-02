import { SlateTool } from 'slates';
import { z } from 'zod';
import { HarvestClient } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `Retrieve projects with optional filtering by active status and client. Returns project details including billing configuration, budget, and team information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      isActive: z.boolean().optional().describe('Filter by active status'),
      clientId: z.number().optional().describe('Filter by client ID'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page (max 2000)')
    })
  )
  .output(
    z.object({
      projects: z.array(
        z.object({
          projectId: z.number().describe('Project ID'),
          name: z.string().describe('Project name'),
          code: z.string().nullable().describe('Project code'),
          clientId: z.number().optional().describe('Client ID'),
          clientName: z.string().optional().describe('Client name'),
          isActive: z.boolean().describe('Whether active'),
          isBillable: z.boolean().describe('Whether billable'),
          isFixedFee: z.boolean().describe('Whether fixed-fee'),
          billBy: z.string().describe('Billing method'),
          budgetBy: z.string().describe('Budget method'),
          budget: z.number().nullable().describe('Budget'),
          hourlyRate: z.number().nullable().describe('Hourly rate'),
          startsOn: z.string().nullable().describe('Start date'),
          endsOn: z.string().nullable().describe('End date')
        })
      ),
      totalEntries: z.number().describe('Total projects'),
      totalPages: z.number().describe('Total pages'),
      page: z.number().describe('Current page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HarvestClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let result = await client.listProjects({
      isActive: ctx.input.isActive,
      clientId: ctx.input.clientId,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let projects = result.results.map((p: any) => ({
      projectId: p.id,
      name: p.name,
      code: p.code,
      clientId: p.client?.id,
      clientName: p.client?.name,
      isActive: p.is_active,
      isBillable: p.is_billable,
      isFixedFee: p.is_fixed_fee,
      billBy: p.bill_by,
      budgetBy: p.budget_by,
      budget: p.budget,
      hourlyRate: p.hourly_rate,
      startsOn: p.starts_on,
      endsOn: p.ends_on
    }));

    return {
      output: {
        projects,
        totalEntries: result.totalEntries,
        totalPages: result.totalPages,
        page: result.page
      },
      message: `Found **${result.totalEntries}** projects (page ${result.page}/${result.totalPages}).`
    };
  })
  .build();
