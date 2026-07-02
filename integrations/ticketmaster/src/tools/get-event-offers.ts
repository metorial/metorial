import { SlateTool } from 'slates';
import { z } from 'zod';
import { CommerceClient } from '../lib/client';
import { spec } from '../spec';

let offerSchema = z.object({
  offerId: z.string(),
  name: z.string(),
  type: z.string(),
  description: z.string(),
  rank: z.number().nullable(),
  currency: z.string(),
  faceValue: z.number().nullable(),
  totalPrice: z.number().nullable(),
  fees: z.array(
    z.object({
      label: z.string(),
      type: z.string(),
      value: z.string()
    })
  ),
  limit: z.object({
    min: z.number().nullable(),
    max: z.number().nullable()
  }),
  protected: z.boolean()
});

let areaSchema = z.object({
  areaId: z.string(),
  name: z.string(),
  rank: z.number().nullable(),
  offers: z.array(z.string()).describe('List of offer IDs available in this area')
});

export let getEventOffersTool = SlateTool.create(spec, {
  name: 'Get Event Offers',
  key: 'get_event_offers',
  description: `Retrieve ticket offers and pricing for a specific event. Returns available ticket types, price levels, face values, fees, purchase limits, and seating areas. Use this to understand ticket availability and pricing before purchase.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: z.string().describe('Ticketmaster event ID')
    })
  )
  .output(
    z.object({
      eventId: z.string(),
      offers: z.array(offerSchema),
      areas: z.array(areaSchema),
      limits: z.object({
        min: z.number().nullable(),
        max: z.number().nullable()
      }),
      prices: z.array(
        z.object({
          type: z.string(),
          currency: z.string(),
          min: z.number().nullable(),
          max: z.number().nullable()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new CommerceClient({
      token: ctx.auth.token
    });

    let response = await client.getEventOffers(ctx.input.eventId);

    let rawOffers = response?.offers?.offer || response?.offers || [];
    let offers = (Array.isArray(rawOffers) ? rawOffers : []).map((o: any) => ({
      offerId: o.id || o.offerId || '',
      name: o.name || '',
      type: o.type || '',
      description: o.description || '',
      rank: o.rank ?? null,
      currency: o.currency || o.prices?.[0]?.currency || '',
      faceValue: o.faceValue ?? o.prices?.[0]?.value ?? null,
      totalPrice: o.totalPrice ?? o.prices?.[0]?.total ?? null,
      fees: (o.charges || o.fees || []).map((f: any) => ({
        label: f.reason || f.label || f.type || '',
        type: f.type || '',
        value: String(f.amount ?? f.value ?? '')
      })),
      limit: {
        min: o.limit?.min ?? o.limits?.min ?? null,
        max: o.limit?.max ?? o.limits?.max ?? null
      },
      protected: o.protected || false
    }));

    let rawAreas = response?.areas || [];
    let areas = (Array.isArray(rawAreas) ? rawAreas : []).map((a: any) => ({
      areaId: a.id || a.areaId || '',
      name: a.name || '',
      rank: a.rank ?? null,
      offers: (a.offers || []).map((o: any) => (typeof o === 'string' ? o : o.id || ''))
    }));

    let rawLimits = response?.limits || {};
    let limits = {
      min: rawLimits.min ?? null,
      max: rawLimits.max ?? null
    };

    let rawPrices = response?.prices?.priceRange || response?.priceRanges || [];
    let prices = (Array.isArray(rawPrices) ? rawPrices : []).map((p: any) => ({
      type: p.type || '',
      currency: p.currency || '',
      min: p.min ?? null,
      max: p.max ?? null
    }));

    return {
      output: { eventId: ctx.input.eventId, offers, areas, limits, prices },
      message: `Found **${offers.length}** offers across **${areas.length}** areas for event ${ctx.input.eventId}.`
    };
  })
  .build();
