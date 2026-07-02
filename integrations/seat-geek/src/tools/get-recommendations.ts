import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRecommendations = SlateTool.create(spec, {
  name: 'Get Recommendations',
  key: 'get_recommendations',
  description: `Get recommended events or performers based on seed performers or events. Returns results scored by affinity. Useful for discovering similar events or performers.

For **event recommendations**, geolocation is required (provide postalCode, geoIp, or latitude/longitude). Supports the same date and venue filters as event search.
For **performer recommendations**, geolocation is optional.`,
  instructions: [
    'You must provide at least one seed: either seedPerformerIds or seedEventId.',
    'For event recommendations (the default), geolocation is required. Provide postalCode, geoIp, or latitude+longitude.',
    'Set recommendationType to "performers" to get performer recommendations instead of events.',
    'Multiple seedPerformerIds can be provided for more nuanced recommendations.'
  ],
  constraints: [
    'Geolocation is required for event recommendations.',
    'At least one seed (performer IDs or event ID) must be provided.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      recommendationType: z
        .enum(['events', 'performers'])
        .optional()
        .describe('Type of recommendations to return. Default: "events"'),
      seedPerformerIds: z
        .array(z.number())
        .optional()
        .describe('Performer IDs to use as recommendation seeds'),
      seedEventId: z.number().optional().describe('Event ID to use as a recommendation seed'),
      postalCode: z
        .string()
        .optional()
        .describe('Postal code for geolocation (required for event recommendations)'),
      latitude: z
        .number()
        .optional()
        .describe('Latitude for geolocation (requires longitude)'),
      longitude: z
        .number()
        .optional()
        .describe('Longitude for geolocation (requires latitude)'),
      geoIp: z
        .string()
        .optional()
        .describe('IP address for geolocation, or "true" to auto-detect'),
      range: z
        .string()
        .optional()
        .describe('Search radius (e.g., "200mi"). Default for recommendations: 200mi'),
      dateFrom: z
        .string()
        .optional()
        .describe('Filter events on or after this date (ISO 8601)'),
      dateTo: z
        .string()
        .optional()
        .describe('Filter events on or before this date (ISO 8601)'),
      taxonomyName: z.string().optional().describe('Filter by taxonomy name'),
      venueId: z.number().optional().describe('Filter by venue ID'),
      page: z.number().optional().describe('Page number (1-indexed). Default: 1'),
      perPage: z.number().optional().describe('Results per page. Default: 10')
    })
  )
  .output(
    z.object({
      recommendations: z
        .array(
          z.object({
            affinity: z.number().describe('Recommendation affinity score'),
            eventId: z
              .number()
              .optional()
              .describe('Recommended event ID (for event recommendations)'),
            eventTitle: z.string().optional().describe('Recommended event title'),
            eventUrl: z.string().optional().describe('SeatGeek URL for the event'),
            eventDatetimeLocal: z
              .string()
              .optional()
              .describe('Event date/time in local timezone'),
            venueName: z.string().optional().describe('Venue name'),
            venueCity: z.string().optional().describe('Venue city'),
            performerId: z
              .number()
              .optional()
              .describe('Recommended performer ID (for performer recommendations)'),
            performerName: z.string().optional().describe('Recommended performer name'),
            performerUrl: z.string().optional().describe('SeatGeek URL for the performer'),
            performerImage: z.string().nullable().optional().describe('Performer image URL'),
            performerScore: z.number().optional().describe('Performer popularity score')
          })
        )
        .describe('List of recommendations sorted by affinity'),
      total: z.number().describe('Total number of recommendations'),
      page: z.number().describe('Current page number'),
      perPage: z.number().describe('Results per page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      clientId: ctx.auth.clientId,
      clientSecret: ctx.auth.clientSecret,
      affiliateId: ctx.config.affiliateId,
      referralId: ctx.config.referralId
    });

    let params: Record<string, string> = {};

    if (ctx.input.seedPerformerIds?.length)
      params['performers.id'] = ctx.input.seedPerformerIds.join(',');
    if (ctx.input.seedEventId) params['events.id'] = String(ctx.input.seedEventId);
    if (ctx.input.postalCode) params.postal_code = ctx.input.postalCode;
    if (ctx.input.latitude) params.lat = String(ctx.input.latitude);
    if (ctx.input.longitude) params.lon = String(ctx.input.longitude);
    if (ctx.input.geoIp) params.geoip = ctx.input.geoIp;
    if (ctx.input.range) params.range = ctx.input.range;
    if (ctx.input.dateFrom) params['datetime_utc.gte'] = ctx.input.dateFrom;
    if (ctx.input.dateTo) params['datetime_utc.lte'] = ctx.input.dateTo;
    if (ctx.input.taxonomyName) params['taxonomies.name'] = ctx.input.taxonomyName;
    if (ctx.input.venueId) params['venue.id'] = String(ctx.input.venueId);
    if (ctx.input.page) params.page = String(ctx.input.page);
    if (ctx.input.perPage) params.per_page = String(ctx.input.perPage);

    let isPerformerRecs = ctx.input.recommendationType === 'performers';

    if (isPerformerRecs) {
      let response = await client.getPerformerRecommendations(params);

      let recommendations = response.recommendations.map(r => ({
        affinity: r.affinity,
        performerId: r.performer.id,
        performerName: r.performer.name,
        performerUrl: r.performer.url,
        performerImage: r.performer.image || null,
        performerScore: r.performer.score
      }));

      let total = response.meta.total;
      let page = response.meta.page;
      let perPage = response.meta.per_page;

      let summaryParts = [
        `Found **${total}** performer recommendation(s) (page ${page}, showing ${recommendations.length})`
      ];
      if (recommendations.length > 0) {
        summaryParts.push('\n\nTop recommendations:');
        for (let r of recommendations.slice(0, 5)) {
          summaryParts.push(
            `- **${r.performerName}** (affinity: ${r.affinity.toFixed(3)}, score: ${r.performerScore?.toFixed(2) ?? 'N/A'})`
          );
        }
      }

      return {
        output: { recommendations, total, page, perPage },
        message: summaryParts.join('\n')
      };
    } else {
      let response = await client.getEventRecommendations(params);

      let recommendations = response.recommendations.map(r => ({
        affinity: r.affinity,
        eventId: r.event.id,
        eventTitle: r.event.title,
        eventUrl: r.event.url,
        eventDatetimeLocal: r.event.datetime_local,
        venueName: r.event.venue.name,
        venueCity: r.event.venue.city
      }));

      let total = response.meta.total;
      let page = response.meta.page;
      let perPage = response.meta.per_page;

      let summaryParts = [
        `Found **${total}** event recommendation(s) (page ${page}, showing ${recommendations.length})`
      ];
      if (recommendations.length > 0) {
        summaryParts.push('\n\nTop recommendations:');
        for (let r of recommendations.slice(0, 5)) {
          summaryParts.push(
            `- **${r.eventTitle}** at ${r.venueName}, ${r.venueCity} — ${r.eventDatetimeLocal} (affinity: ${r.affinity.toFixed(3)})`
          );
        }
      }

      return {
        output: { recommendations, total, page, perPage },
        message: summaryParts.join('\n')
      };
    }
  })
  .build();
