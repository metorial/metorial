import { SlateTool } from 'slates';
import { z } from 'zod';
import { receiptMessage, receiptOutput, SerpApiClient } from '../lib/client';
import { searchMetadataSchema } from '../lib/contracts';
import { searchParams } from '../lib/params';
import { spec } from '../spec';

let flightResultSchema = z.object({
  airline: z.string().optional().describe('Airline name'),
  airlineLogo: z.string().optional().describe('Airline logo URL'),
  departureAirport: z.string().optional().describe('Departure airport name'),
  departureAirportCode: z.string().optional().describe('Departure airport IATA code'),
  departureTime: z.string().optional().describe('Departure time'),
  arrivalAirport: z.string().optional().describe('Arrival airport name'),
  arrivalAirportCode: z.string().optional().describe('Arrival airport IATA code'),
  arrivalTime: z.string().optional().describe('Arrival time'),
  duration: z.number().optional().describe('Flight duration in minutes'),
  stops: z.number().optional().describe('Number of stops'),
  price: z.number().optional().describe('Price in the local currency'),
  tripType: z.string().optional().describe('Type of trip (round trip, one way)'),
  layovers: z
    .array(
      z.object({
        name: z.string().optional().describe('Layover airport'),
        duration: z.number().optional().describe('Layover duration in minutes')
      })
    )
    .optional()
    .describe('Layover details')
});

export let flightsSearchTool = SlateTool.create(spec, {
  name: 'Flights Search',
  key: 'flights_search',
  description: `Search Google Flights for flight options between airports. Returns flight prices, airlines, durations, stops, layover details, and booking information. Useful for finding and comparing flight options.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      departureAirport: z
        .string()
        .describe('Departure airport IATA code (e.g., "JFK", "LAX")'),
      arrivalAirport: z.string().describe('Arrival airport IATA code (e.g., "LHR", "CDG")'),
      outboundDate: z.string().describe('Outbound date in YYYY-MM-DD format'),
      returnDate: z
        .string()
        .optional()
        .describe('Return date in YYYY-MM-DD format (omit for one-way)'),
      currency: z.string().optional().describe('Currency code (e.g., "USD", "EUR")'),
      language: z.string().optional().describe('Language code (e.g., "en")'),
      country: z.string().optional().describe('Country code (e.g., "us")'),
      travelClass: z
        .enum(['1', '2', '3', '4'])
        .optional()
        .describe('Travel class: 1=Economy, 2=Premium Economy, 3=Business, 4=First'),
      adults: z.number().optional().describe('Number of adult passengers'),
      stops: z
        .enum(['0', '1', '2', '3'])
        .optional()
        .describe('Native stops: 0=any, 1=nonstop, 2=up to 1, 3=up to 2'),
      async: z
        .boolean()
        .optional()
        .describe(
          'Submit asynchronously and return the native search ID/status. Not compatible with noCache or Ludicrous Speed accounts.'
        ),
      noCache: z.boolean().optional().describe('Force fresh results')
    })
  )
  .output(
    z.object({
      isComplete: z
        .boolean()
        .describe(
          'Whether native search status is Success; queued/processing receipts are incomplete.'
        ),
      pagination: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Native pagination metadata; follow native offsets/tokens without inferring a total.'
        ),
      searchMetadata: searchMetadataSchema.optional(),
      bestFlights: z.array(flightResultSchema).describe('Best flight options'),
      otherFlights: z.array(flightResultSchema).describe('Other available flight options'),
      priceInsights: z
        .object({
          lowestPrice: z.number().optional().describe('Lowest price found'),
          priceLevel: z
            .string()
            .optional()
            .describe('Price level indicator (low, typical, high)')
        })
        .optional()
        .describe('Price insight information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SerpApiClient({ apiKey: ctx.auth.token, accountId: ctx.auth.accountId });

    let params = searchParams('flights_search', ctx.input);

    let data = await client.search(params);

    let mapFlight = (flight: any) => {
      let firstLeg = flight.flights?.[0];
      let lastLeg = flight.flights?.[flight.flights?.length - 1];
      return {
        airline: firstLeg?.airline,
        airlineLogo: firstLeg?.airline_logo,
        departureAirport: firstLeg?.departure_airport?.name,
        departureAirportCode: firstLeg?.departure_airport?.id,
        departureTime: firstLeg?.departure_airport?.time,
        arrivalAirport: lastLeg?.arrival_airport?.name,
        arrivalAirportCode: lastLeg?.arrival_airport?.id,
        arrivalTime: lastLeg?.arrival_airport?.time,
        duration: flight.total_duration,
        stops: flight.flights?.length ? flight.flights.length - 1 : undefined,
        price: flight.price,
        tripType: flight.type,
        layovers: (flight.layovers || []).map((l: any) => ({
          name: l.name,
          duration: l.duration
        }))
      };
    };

    let bestFlights = (data.best_flights || []).map(mapFlight);
    let otherFlights = (data.other_flights || []).map(mapFlight);

    let priceInsights = data.price_insights
      ? {
          lowestPrice: data.price_insights.lowest_price,
          priceLevel: data.price_insights.price_level
        }
      : undefined;

    let totalFlights = bestFlights.length + otherFlights.length;

    return {
      output: {
        ...receiptOutput(data),
        bestFlights,
        otherFlights,
        priceInsights
      },
      message: receiptMessage(
        data,
        `Flight search from ${ctx.input.departureAirport} to ${ctx.input.arrivalAirport} on ${ctx.input.outboundDate} found **${totalFlights}** options (${bestFlights.length} best, ${otherFlights.length} other).${priceInsights?.lowestPrice ? ` Lowest price: ${priceInsights.lowestPrice} ${ctx.input.currency ?? 'USD'}.` : ''}`
      )
    };
  })
  .build();
