import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getBaseUrl } from '../lib/helpers';
import { spec } from '../spec';

export let manageGarnishment = SlateTool.create(spec, {
  name: 'Manage Garnishment',
  key: 'manage_garnishment',
  description: `List, create, or update wage garnishments for an employee. Supports child support and other garnishment types with configurable amounts and schedules.`
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update']).describe('The action to perform'),
      employeeId: z.string().optional().describe('Employee UUID (required for list/create)'),
      garnishmentId: z.string().optional().describe('Garnishment UUID (required for update)'),
      version: z
        .string()
        .optional()
        .describe('Resource version for optimistic locking (required for update)'),
      description: z.string().optional().describe('Description of the garnishment'),
      active: z.boolean().optional().describe('Whether the garnishment is active'),
      amount: z.number().optional().describe('Garnishment amount per pay period'),
      courtOrdered: z.boolean().optional().describe('Whether court-ordered'),
      times: z.number().optional().describe('Number of times to deduct (null for ongoing)'),
      recurringChildSupport: z
        .boolean()
        .optional()
        .describe('Whether this is recurring child support'),
      annualMaximum: z.number().optional().describe('Annual maximum deduction'),
      payPeriodMaximum: z.number().optional().describe('Maximum deduction per pay period'),
      deductAsPercentage: z.boolean().optional().describe('Whether to deduct as a percentage')
    })
  )
  .output(
    z.object({
      garnishments: z
        .array(
          z.object({
            garnishmentId: z.string().describe('UUID of the garnishment'),
            description: z.string().optional().describe('Description'),
            active: z.boolean().optional().describe('Whether active'),
            amount: z.number().optional().describe('Amount per pay period'),
            courtOrdered: z.boolean().optional().describe('Whether court-ordered')
          })
        )
        .optional()
        .describe('List of garnishments (for list action)'),
      garnishment: z
        .object({
          garnishmentId: z.string().describe('UUID of the garnishment'),
          description: z.string().optional().describe('Description'),
          active: z.boolean().optional().describe('Whether active'),
          amount: z.number().optional().describe('Amount per pay period'),
          courtOrdered: z.boolean().optional().describe('Whether court-ordered'),
          version: z.string().optional().describe('Current resource version')
        })
        .optional()
        .describe('Single garnishment (for create/update)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: getBaseUrl(ctx.auth.environment)
    });

    switch (ctx.input.action) {
      case 'list': {
        if (!ctx.input.employeeId) throw new Error('employeeId is required');
        let result = await client.listGarnishments(ctx.input.employeeId);
        let garnishments = Array.isArray(result) ? result : result.garnishments || result;
        let mapped = garnishments.map((g: any) => ({
          garnishmentId: g.uuid || g.id?.toString(),
          description: g.description,
          active: g.active,
          amount: g.amount,
          courtOrdered: g.court_ordered
        }));
        return {
          output: { garnishments: mapped },
          message: `Found **${mapped.length}** garnishment(s).`
        };
      }
      case 'create': {
        if (!ctx.input.employeeId) throw new Error('employeeId is required');
        let result = await client.createGarnishment(ctx.input.employeeId, {
          description: ctx.input.description,
          active: ctx.input.active,
          amount: ctx.input.amount,
          court_ordered: ctx.input.courtOrdered,
          times: ctx.input.times,
          recurring_child_support: ctx.input.recurringChildSupport,
          annual_maximum: ctx.input.annualMaximum,
          pay_period_maximum: ctx.input.payPeriodMaximum,
          deduct_as_percentage: ctx.input.deductAsPercentage
        });
        return {
          output: {
            garnishment: {
              garnishmentId: result.uuid || result.id?.toString(),
              description: result.description,
              active: result.active,
              amount: result.amount,
              courtOrdered: result.court_ordered,
              version: result.version
            }
          },
          message: `Created garnishment "${ctx.input.description}" for employee ${ctx.input.employeeId}.`
        };
      }
      case 'update': {
        if (!ctx.input.garnishmentId) throw new Error('garnishmentId is required');
        let data: Record<string, any> = {};
        if (ctx.input.version) data.version = ctx.input.version;
        if (ctx.input.description !== undefined) data.description = ctx.input.description;
        if (ctx.input.active !== undefined) data.active = ctx.input.active;
        if (ctx.input.amount !== undefined) data.amount = ctx.input.amount;
        if (ctx.input.courtOrdered !== undefined) data.court_ordered = ctx.input.courtOrdered;
        if (ctx.input.times !== undefined) data.times = ctx.input.times;
        if (ctx.input.annualMaximum !== undefined)
          data.annual_maximum = ctx.input.annualMaximum;
        if (ctx.input.payPeriodMaximum !== undefined)
          data.pay_period_maximum = ctx.input.payPeriodMaximum;
        if (ctx.input.deductAsPercentage !== undefined)
          data.deduct_as_percentage = ctx.input.deductAsPercentage;
        let result = await client.updateGarnishment(ctx.input.garnishmentId, data);
        return {
          output: {
            garnishment: {
              garnishmentId: result.uuid || result.id?.toString(),
              description: result.description,
              active: result.active,
              amount: result.amount,
              courtOrdered: result.court_ordered,
              version: result.version
            }
          },
          message: `Updated garnishment ${ctx.input.garnishmentId}.`
        };
      }
    }
  })
  .build();
