import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreeAgentClient } from '../lib/client';
import { spec } from '../spec';

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new project in FreeAgent linked to a contact. Projects can track time, expenses, and invoices for a client engagement.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('Contact ID to associate with the project'),
      name: z.string().describe('Project name'),
      budgetUnits: z
        .enum(['Hours', 'Days', 'Monetary'])
        .optional()
        .describe('Budget unit type'),
      budget: z.string().optional().describe('Budget amount'),
      currency: z.string().optional().describe('Currency code'),
      startsOn: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      endsOn: z.string().optional().describe('End date in YYYY-MM-DD format'),
      billingPeriod: z
        .enum(['hour', 'day', 'week', 'month', 'year'])
        .optional()
        .describe('Billing period'),
      normalBillingRate: z.string().optional().describe('Normal billing rate'),
      hoursPerDay: z.string().optional().describe('Hours per day for day rate calculations'),
      includesVat: z.boolean().optional().describe('Whether amounts include VAT')
    })
  )
  .output(
    z.object({
      project: z.record(z.string(), z.any()).describe('The newly created project')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreeAgentClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let projectData: Record<string, any> = {
      contact: ctx.input.contactId,
      name: ctx.input.name
    };

    if (ctx.input.budgetUnits) projectData.budget_units = ctx.input.budgetUnits;
    if (ctx.input.budget) projectData.budget = ctx.input.budget;
    if (ctx.input.currency) projectData.currency = ctx.input.currency;
    if (ctx.input.startsOn) projectData.starts_on = ctx.input.startsOn;
    if (ctx.input.endsOn) projectData.ends_on = ctx.input.endsOn;
    if (ctx.input.billingPeriod) projectData.billing_period = ctx.input.billingPeriod;
    if (ctx.input.normalBillingRate)
      projectData.normal_billing_rate = ctx.input.normalBillingRate;
    if (ctx.input.hoursPerDay) projectData.hours_per_day = ctx.input.hoursPerDay;
    if (ctx.input.includesVat !== undefined) projectData.includes_vat = ctx.input.includesVat;

    let project = await client.createProject(projectData);

    return {
      output: { project },
      message: `Created project **${ctx.input.name}**`
    };
  })
  .build();
