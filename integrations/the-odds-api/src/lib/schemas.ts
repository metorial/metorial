import { z } from 'zod';
import type { Event, EventMarkets, EventWithOdds, SportEventWithOdds } from './types';

export let eventSchema = z.object({
  eventId: z.string().describe('Unique event identifier'),
  sportKey: z.string().describe('Sport key'),
  sportTitle: z.string().describe('Sport display name'),
  commenceTime: z.string().describe('ISO timestamp of event start time'),
  homeTeam: z.string().nullable().describe('Home team name'),
  awayTeam: z.string().nullable().describe('Away team name'),
  homeRotation: z
    .number()
    .nullable()
    .optional()
    .describe('Home team rotation number, when available'),
  awayRotation: z
    .number()
    .nullable()
    .optional()
    .describe('Away team rotation number, when available')
});

export let outcomeSchema = z.object({
  name: z.string().describe('Outcome name (team name, Over, Under, Draw, etc.)'),
  price: z.number().describe('Odds price in the requested format'),
  point: z.number().optional().describe('Point spread or total value'),
  description: z
    .string()
    .optional()
    .describe(
      'Participant name or other selection context, including the player for player props'
    ),
  link: z
    .string()
    .optional()
    .describe('Bookmaker link for this selection, when requested and available'),
  sid: z
    .string()
    .optional()
    .describe('Bookmaker source identifier, when requested and available'),
  betLimit: z.number().optional().describe('Bet limit, when requested and available')
});

export let marketSchema = z.object({
  marketKey: z.string().describe('Market type key'),
  lastUpdate: z.string().optional().describe('ISO timestamp of the last odds update'),
  link: z
    .string()
    .nullable()
    .optional()
    .describe('Bookmaker market link, when requested and available'),
  sid: z
    .string()
    .nullable()
    .optional()
    .describe('Bookmaker market source identifier, when requested and available'),
  outcomes: z.array(outcomeSchema)
});

export let bookmakerSchema = z.object({
  bookmakerKey: z.string().describe('Bookmaker identifier'),
  title: z.string().describe('Bookmaker display name'),
  lastUpdate: z
    .string()
    .optional()
    .describe(
      'Bookmaker update timestamp when returned; event odds report updates on each market instead'
    ),
  link: z.string().optional().describe('Bookmaker event link, when requested and available'),
  sid: z
    .string()
    .optional()
    .describe('Bookmaker event source identifier, when requested and available'),
  markets: z.array(marketSchema)
});

export let eventWithOddsSchema = eventSchema.extend({ bookmakers: z.array(bookmakerSchema) });
export let sportOddsSchema = eventSchema.extend({
  bookmakers: z.array(
    bookmakerSchema.extend({
      lastUpdate: z.string().describe('ISO timestamp of the last update from this bookmaker')
    })
  )
});

export let eventMarketsSchema = eventSchema.extend({
  bookmakers: z.array(
    z.object({
      bookmakerKey: z.string().describe('Bookmaker identifier'),
      title: z.string().describe('Bookmaker display name'),
      markets: z.array(
        z.object({
          marketKey: z.string().describe('Market key identifier'),
          lastUpdate: z.string().describe('ISO timestamp of the last market update')
        })
      )
    })
  )
});

export let mapEvent = (event: Event) => ({
  eventId: event.id,
  sportKey: event.sport_key,
  sportTitle: event.sport_title,
  commenceTime: event.commence_time,
  homeTeam: event.home_team,
  awayTeam: event.away_team,
  homeRotation: event.home_rotation,
  awayRotation: event.away_rotation
});

export function mapEventWithOdds(event: SportEventWithOdds): z.infer<typeof sportOddsSchema>;
export function mapEventWithOdds(event: EventWithOdds): z.infer<typeof eventWithOddsSchema>;
export function mapEventWithOdds(event: EventWithOdds): z.infer<typeof eventWithOddsSchema> {
  return {
    ...mapEvent(event),
    bookmakers: event.bookmakers.map(bookmaker => ({
      bookmakerKey: bookmaker.key,
      title: bookmaker.title,
      lastUpdate: bookmaker.last_update,
      link: bookmaker.link,
      sid: bookmaker.sid,
      markets: bookmaker.markets.map(market => ({
        marketKey: market.key,
        lastUpdate: market.last_update,
        link: market.link,
        sid: market.sid,
        outcomes: market.outcomes.map(outcome => ({
          name: outcome.name,
          price: outcome.price,
          point: outcome.point,
          description: outcome.description,
          link: outcome.link,
          sid: outcome.sid,
          betLimit: outcome.bet_limit
        }))
      }))
    }))
  };
}

export let mapEventMarkets = (event: EventMarkets) => ({
  ...mapEvent(event),
  bookmakers: event.bookmakers.map(bookmaker => ({
    bookmakerKey: bookmaker.key,
    title: bookmaker.title,
    markets: bookmaker.markets.map(market => ({
      marketKey: market.key,
      lastUpdate: market.last_update
    }))
  }))
});
