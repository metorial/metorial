import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let disasterRecordSchema = z.any().describe('Natural disaster event record');

let eventTypeEnum = z
  .enum(['EQ', 'TN', 'TC', 'WF', 'FL', 'ET', 'DR', 'SW', 'SI', 'VO', 'LS'])
  .optional()
  .describe(
    'Event type code: EQ=Earthquake, TN=Tsunami, TC=Tropical Cyclone, WF=Wildfire, FL=Flood, ET=Extreme Temperature, DR=Drought, SW=Severe Storm, SI=Sea Ice, VO=Volcano, LS=Landslide'
  );

export let getNaturalDisasters = SlateTool.create(spec, {
  name: 'Get Natural Disasters',
  key: 'get_natural_disasters',
  description: `Retrieve real-time natural disaster data including earthquakes, tsunamis, floods, droughts, volcanic eruptions, cyclones, wildfires, and more. Supports querying by coordinates, continent code, or country code, with optional filtering by event type.`,
  instructions: [
    'Event type codes: EQ (Earthquake), TN (Tsunami), TC (Tropical Cyclone), WF (Wildfire), FL (Flood), ET (Extreme Temperature), DR (Drought), SW (Severe Storm), SI (Sea Ice), VO (Volcano), LS (Landslide).',
    'Continent codes: AFR (Africa), ANT (Antarctica), ASIA (Asia), AUS (Australia/Oceania), EUR (Europe), NAR (North America), SAR (South America), Ocean.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      lat: z.number().min(-90).max(90).optional().describe('Latitude (-90 to 90)'),
      lng: z.number().min(-180).max(180).optional().describe('Longitude (-180 to 180)'),
      continent: z
        .string()
        .optional()
        .describe('Continent code (AFR, ANT, ASIA, AUS, EUR, NAR, SAR, Ocean)'),
      countryCode: z.string().optional().describe('3-letter ISO country code'),
      eventType: eventTypeEnum,
      limit: z.number().optional().describe('Number of records per page'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z
      .object({
        message: z.string().optional(),
        disasters: z.array(disasterRecordSchema).describe('Natural disaster event records')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      language: ctx.config.language
    });

    let filterParams = {
      eventType: ctx.input.eventType,
      limit: ctx.input.limit,
      page: ctx.input.page
    };

    let result: any;

    if (ctx.input.lat !== undefined && ctx.input.lng !== undefined) {
      result = await client.getDisastersByLatLng(ctx.input.lat, ctx.input.lng, filterParams);
    } else if (ctx.input.continent) {
      result = await client.getDisastersByContinent(ctx.input.continent, filterParams);
    } else if (ctx.input.countryCode) {
      result = await client.getDisastersByCountryCode(ctx.input.countryCode, filterParams);
    } else {
      throw new Error('Provide lat/lng coordinates, a continent code, or a country code.');
    }

    let disasters = result.data || [];

    return {
      output: {
        message: result.message,
        disasters
      },
      message:
        disasters.length > 0
          ? `Found **${disasters.length}** active disaster event(s)${ctx.input.eventType ? ` of type ${ctx.input.eventType}` : ''}.`
          : 'No active disaster events found for the specified criteria.'
    };
  })
  .build();
