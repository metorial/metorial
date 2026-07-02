import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let pollutantSchema = z.object({
  concentration: z.number().describe('Concentration in µg/m³'),
  aqi: z.number().describe('Air Quality Index value for this pollutant')
});

export let getAirQuality = SlateTool.create(spec, {
  name: 'Get Air Quality',
  key: 'get_air_quality',
  description: `Retrieve current air quality data for a location, including overall AQI and individual pollutant levels (CO, NO₂, O₃, SO₂, PM2.5, PM10). Specify location by coordinates or city name.`,
  instructions: ['Provide either lat/lon or city — only one location method is needed.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      lat: z.number().optional().describe('Latitude of the location'),
      lon: z.number().optional().describe('Longitude of the location'),
      city: z.string().optional().describe('City name'),
      state: z.string().optional().describe('US state (for US cities only)'),
      country: z.string().optional().describe('Country name')
    })
  )
  .output(
    z.object({
      overallAqi: z.number().describe('Overall Air Quality Index'),
      co: pollutantSchema.describe('Carbon Monoxide levels'),
      no2: pollutantSchema.describe('Nitrogen Dioxide levels'),
      o3: pollutantSchema.describe('Ozone levels'),
      so2: pollutantSchema.describe('Sulphur Dioxide levels'),
      pm25: pollutantSchema.describe('PM2.5 particulate levels'),
      pm10: pollutantSchema.describe('PM10 particulate levels')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let params: Record<string, string | number> = {};

    if (ctx.input.lat !== undefined && ctx.input.lon !== undefined) {
      params.lat = ctx.input.lat;
      params.lon = ctx.input.lon;
    }
    if (ctx.input.city) params.city = ctx.input.city;
    if (ctx.input.state) params.state = ctx.input.state;
    if (ctx.input.country) params.country = ctx.input.country;

    let result = await client.getAirQuality(params);

    let locationLabel = ctx.input.city ?? `${ctx.input.lat}, ${ctx.input.lon}`;

    return {
      output: {
        overallAqi: result.overall_aqi,
        co: result.CO,
        no2: result.NO2,
        o3: result.O3,
        so2: result.SO2,
        pm25: result['PM2.5'],
        pm10: result.PM10
      },
      message: `Air quality in **${locationLabel}**: Overall AQI is **${result.overall_aqi}**.`
    };
  })
  .build();
