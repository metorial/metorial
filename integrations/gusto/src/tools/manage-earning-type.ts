import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getBaseUrl } from '../lib/helpers';
import { spec } from '../spec';

export let manageEarningType = SlateTool.create(spec, {
  name: 'Manage Earning Type',
  key: 'manage_earning_type',
  description: `List, create, or update custom earning types for a company. Earning types define categories of compensation (e.g., bonuses, commissions, tips) beyond standard types.`
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update']).describe('The action to perform'),
      companyId: z.string().describe('The UUID of the company'),
      earningTypeId: z.string().optional().describe('Earning type UUID (required for update)'),
      name: z.string().optional().describe('Name of the earning type')
    })
  )
  .output(
    z.object({
      defaultEarningTypes: z
        .array(
          z.object({
            earningTypeId: z.string().describe('UUID of the earning type'),
            name: z.string().optional().describe('Name')
          })
        )
        .optional()
        .describe('Default earning types (for list action)'),
      customEarningTypes: z
        .array(
          z.object({
            earningTypeId: z.string().describe('UUID of the earning type'),
            name: z.string().optional().describe('Name')
          })
        )
        .optional()
        .describe('Custom earning types'),
      earningType: z
        .object({
          earningTypeId: z.string().describe('UUID of the earning type'),
          name: z.string().optional().describe('Name')
        })
        .optional()
        .describe('Created or updated earning type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: getBaseUrl(ctx.auth.environment)
    });

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listEarningTypes(ctx.input.companyId);
        let defaults = (result.default || []).map((e: any) => ({
          earningTypeId: e.uuid || e.id?.toString(),
          name: e.name
        }));
        let custom = (result.custom || []).map((e: any) => ({
          earningTypeId: e.uuid || e.id?.toString(),
          name: e.name
        }));
        return {
          output: { defaultEarningTypes: defaults, customEarningTypes: custom },
          message: `Found **${defaults.length}** default and **${custom.length}** custom earning type(s).`
        };
      }
      case 'create': {
        let result = await client.createEarningType(ctx.input.companyId, {
          name: ctx.input.name
        });
        return {
          output: {
            earningType: {
              earningTypeId: result.uuid || result.id?.toString(),
              name: result.name
            }
          },
          message: `Created earning type **${ctx.input.name}**.`
        };
      }
      case 'update': {
        if (!ctx.input.earningTypeId) throw new Error('earningTypeId is required for update');
        let result = await client.updateEarningType(
          ctx.input.companyId,
          ctx.input.earningTypeId,
          {
            name: ctx.input.name
          }
        );
        return {
          output: {
            earningType: {
              earningTypeId: result.uuid || result.id?.toString(),
              name: result.name
            }
          },
          message: `Updated earning type ${ctx.input.earningTypeId}.`
        };
      }
    }
  })
  .build();
