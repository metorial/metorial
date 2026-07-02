import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpenWeatherClient } from '../lib/client';
import { spec } from '../spec';

export let getWeatherOverview = SlateTool.create(spec, {
  name: 'Get Weather Overview',
  key: 'get_weather_overview',
  description: `Get a human-readable weather summary for a location, generated using OpenWeather's AI technologies. Returns a concise natural-language description of current and upcoming weather conditions. Requires One Call API 3.0 subscription.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      latitude: z.number().min(-90).max(90).describe('Latitude of the location'),
      longitude: z.number().min(-180).max(180).describe('Longitude of the location'),
      date: z
        .string()
        .optional()
        .describe('Date for the overview in YYYY-MM-DD format (optional, defaults to today)')
    })
  )
  .output(
    z.object({
      latitude: z.number().describe('Latitude'),
      longitude: z.number().describe('Longitude'),
      timezone: z.string().optional().describe('Timezone name'),
      date: z.string().optional().describe('Date of the overview'),
      weatherOverview: z.string().describe('Human-readable weather summary')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpenWeatherClient({
      apiKey: ctx.auth.token,
      units: ctx.config.units,
      lang: ctx.config.language
    });

    let data = await client.getOneCallOverview(
      ctx.input.latitude,
      ctx.input.longitude,
      ctx.input.date
    );

    let output = {
      latitude: data.lat,
      longitude: data.lon,
      timezone: data.tz,
      date: data.date,
      weatherOverview: data.weather_overview
    };

    return {
      output,
      message: output.weatherOverview
    };
  })
  .build();
