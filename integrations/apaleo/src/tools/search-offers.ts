import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApaleoClient } from '../lib/client';
import { spec } from '../spec';

export let searchOffers = SlateTool.create(spec, {
  name: 'Search Offers',
  key: 'search_offers',
  description: `Search for available room offers for a specific property, dates, and guest configuration. Returns available rate plans with pricing, room type details, and availability. Use this to find what's available before creating a booking.`,
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      propertyId: z
        .string()
        .optional()
        .describe('Property ID to search (uses default from config if not set)'),
      arrival: z.string().describe('Arrival date (YYYY-MM-DD)'),
      departure: z.string().describe('Departure date (YYYY-MM-DD)'),
      adults: z.number().describe('Number of adult guests'),
      childrenAges: z.array(z.number()).optional().describe('Ages of child guests'),
      channelCode: z.string().optional().describe('Distribution channel code'),
      promoCode: z.string().optional().describe('Promotional code'),
      corporateCode: z.string().optional().describe('Corporate rate code'),
      unitGroupIds: z.array(z.string()).optional().describe('Filter by specific room type IDs')
    })
  )
  .output(
    z.object({
      offers: z
        .array(
          z
            .object({
              unitGroup: z
                .object({
                  unitGroupId: z.string().optional(),
                  name: z.string().optional(),
                  description: z.string().optional(),
                  maxPersons: z.number().optional()
                })
                .optional(),
              ratePlan: z
                .object({
                  ratePlanId: z.string().optional(),
                  name: z.string().optional(),
                  description: z.string().optional(),
                  channelCode: z.string().optional()
                })
                .optional(),
              totalGrossAmount: z
                .object({
                  amount: z.number().optional(),
                  currency: z.string().optional()
                })
                .optional(),
              availableUnits: z.number().optional().describe('Number of available rooms'),
              isSoldOut: z.boolean().optional()
            })
            .passthrough()
        )
        .describe('Available offers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApaleoClient(ctx.auth.token);
    let propertyId = ctx.input.propertyId || ctx.config.propertyId;
    if (!propertyId)
      throw new Error('propertyId is required — set it in config or provide it as input');

    let result = await client.getOffers({
      propertyId,
      arrival: ctx.input.arrival,
      departure: ctx.input.departure,
      adults: ctx.input.adults,
      childrenAges: ctx.input.childrenAges,
      channelCode: ctx.input.channelCode,
      promoCode: ctx.input.promoCode,
      corporateCode: ctx.input.corporateCode,
      unitGroupIds: ctx.input.unitGroupIds
    });

    let offers = (result.offers || []).map((o: any) => ({
      unitGroup: o.unitGroup
        ? {
            unitGroupId: o.unitGroup.id,
            name: o.unitGroup.name,
            description: o.unitGroup.description,
            maxPersons: o.unitGroup.maxPersons
          }
        : undefined,
      ratePlan: o.ratePlan
        ? {
            ratePlanId: o.ratePlan.id,
            name: o.ratePlan.name,
            description: o.ratePlan.description,
            channelCode: o.ratePlan.channelCode
          }
        : undefined,
      totalGrossAmount: o.totalGrossAmount,
      availableUnits: o.availableUnits,
      isSoldOut: o.isSoldOut
    }));

    let available = offers.filter((o: any) => !o.isSoldOut);

    return {
      output: { offers },
      message: `Found **${offers.length}** offers (**${available.length}** available) for ${ctx.input.arrival} → ${ctx.input.departure}, ${ctx.input.adults} adult(s).`
    };
  })
  .build();
