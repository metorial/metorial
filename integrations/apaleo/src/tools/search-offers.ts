import { createApiServiceError, SlateTool } from 'slates';
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
        .describe('Property ID from list_properties; uses the configured default if omitted.'),
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
              timeSlices: z
                .array(z.record(z.string(), z.unknown()))
                .optional()
                .describe('Offer pricing and availability for each time slice.'),
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
      throw createApiServiceError(
        'propertyId is required — set it in config or provide it as input'
      );

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
      unitGroup:
        (o.unitGroup ?? undefined)
          ? {
              unitGroupId: o.unitGroup.id ?? undefined,
              name: o.unitGroup.name ?? undefined,
              description: o.unitGroup.description ?? undefined,
              maxPersons: o.unitGroup.maxPersons ?? undefined
            }
          : undefined,
      ratePlan:
        (o.ratePlan ?? undefined)
          ? {
              ratePlanId: o.ratePlan.id ?? undefined,
              name: o.ratePlan.name ?? undefined,
              description: o.ratePlan.description ?? undefined,
              channelCode: o.ratePlan.channelCode ?? undefined
            }
          : undefined,
      totalGrossAmount: o.totalGrossAmount ?? undefined,
      timeSlices: o.timeSlices ?? undefined,
      availableUnits: o.availableUnits ?? undefined,
      isSoldOut: o.isSoldOut ?? o.availableUnits <= 0
    }));

    let available = offers.filter((o: any) => !o.isSoldOut);

    return {
      output: { offers },
      message: `Found **${offers.length}** offers (**${available.length}** available) for ${ctx.input.arrival} → ${ctx.input.departure}, ${ctx.input.adults} adult(s).`
    };
  })
  .build();
