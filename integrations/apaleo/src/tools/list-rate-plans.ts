import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApaleoClient } from '../lib/client';
import { spec } from '../spec';

export let listRatePlans = SlateTool.create(spec, {
  name: 'List Rate Plans',
  key: 'list_rate_plans',
  description: `List rate plans for a property. Rate plans define pricing rules and policies for reservations. Filter by property, room type, or distribution channel. Returns plan details including pricing model and restrictions.`,
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      propertyId: z
        .string()
        .optional()
        .describe('Property ID (uses default from config if not set)'),
      unitGroupId: z.string().optional().describe('Filter by room type ID'),
      channelCode: z.string().optional().describe('Filter by distribution channel'),
      pageNumber: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      ratePlans: z
        .array(
          z
            .object({
              ratePlanId: z.string().describe('Rate plan ID'),
              name: z.string().optional().describe('Rate plan name'),
              description: z.string().optional(),
              channelCode: z.string().optional(),
              property: z
                .object({
                  propertyId: z.string().optional(),
                  name: z.string().optional()
                })
                .optional(),
              unitGroup: z
                .object({
                  unitGroupId: z.string().optional(),
                  name: z.string().optional()
                })
                .optional(),
              isSubjectToCityTax: z.boolean().optional(),
              pricingUnit: z.string().optional().describe('Pricing unit (e.g., Room, Person)'),
              minGuaranteeType: z.string().optional(),
              created: z.string().optional(),
              modified: z.string().optional()
            })
            .passthrough()
        )
        .describe('List of rate plans'),
      count: z.number().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApaleoClient(ctx.auth.token);

    let result = await client.listRatePlans({
      propertyId: ctx.input.propertyId || ctx.config.propertyId,
      unitGroupId: ctx.input.unitGroupId,
      channelCode: ctx.input.channelCode,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let ratePlans = (result.ratePlans || []).map((rp: any) => ({
      ratePlanId: rp.id,
      name: rp.name,
      description: rp.description,
      channelCode: rp.channelCode,
      property: rp.property
        ? { propertyId: rp.property.id, name: rp.property.name }
        : undefined,
      unitGroup: rp.unitGroup
        ? { unitGroupId: rp.unitGroup.id, name: rp.unitGroup.name }
        : undefined,
      isSubjectToCityTax: rp.isSubjectToCityTax,
      pricingUnit: rp.pricingUnit,
      minGuaranteeType: rp.minGuaranteeType,
      created: rp.created,
      modified: rp.modified
    }));

    return {
      output: {
        ratePlans,
        count: result.count || ratePlans.length
      },
      message: `Found **${result.count || ratePlans.length}** rate plans.`
    };
  })
  .build();
