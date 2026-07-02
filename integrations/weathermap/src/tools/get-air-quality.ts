import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpenWeatherClient } from '../lib/client';
import { spec } from '../spec';

let pollutantComponentsSchema = z.object({
  co: z.number().optional().describe('Carbon monoxide (CO) in ug/m3'),
  no: z.number().optional().describe('Nitrogen monoxide (NO) in ug/m3'),
  no2: z.number().optional().describe('Nitrogen dioxide (NO2) in ug/m3'),
  o3: z.number().optional().describe('Ozone (O3) in ug/m3'),
  so2: z.number().optional().describe('Sulphur dioxide (SO2) in ug/m3'),
  pm2_5: z.number().optional().describe('Fine particulate matter (PM2.5) in ug/m3'),
  pm10: z.number().optional().describe('Coarse particulate matter (PM10) in ug/m3'),
  nh3: z.number().optional().describe('Ammonia (NH3) in ug/m3')
});

let airQualityEntrySchema = z.object({
  timestamp: z.string().describe('Data point time (ISO 8601)'),
  airQualityIndex: z
    .number()
    .describe('Air Quality Index (1=Good, 2=Fair, 3=Moderate, 4=Poor, 5=Very Poor)'),
  components: pollutantComponentsSchema.describe('Pollutant concentrations')
});

export let getAirQuality = SlateTool.create(spec, {
  name: 'Get Air Quality',
  key: 'get_air_quality',
  description: `Retrieve air pollution data for a location, including the Air Quality Index (AQI) and concentrations of polluting gases (CO, NO, NO2, O3, SO2, NH3, PM2.5, PM10). Supports current conditions, 4-day hourly forecast, and historical data from November 27, 2020.`,
  instructions: [
    'Set mode to "current" for latest air quality, "forecast" for 4-day hourly forecast, or "history" for a specific date range',
    'For historical data, provide startTimestamp and endTimestamp as Unix timestamps (UTC)'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      latitude: z.number().min(-90).max(90).describe('Latitude of the location'),
      longitude: z.number().min(-180).max(180).describe('Longitude of the location'),
      mode: z
        .enum(['current', 'forecast', 'history'])
        .default('current')
        .describe('Type of air quality data to retrieve'),
      startTimestamp: z
        .number()
        .optional()
        .describe('Start Unix timestamp (UTC) for historical data'),
      endTimestamp: z
        .number()
        .optional()
        .describe('End Unix timestamp (UTC) for historical data')
    })
  )
  .output(
    z.object({
      latitude: z.number().describe('Latitude'),
      longitude: z.number().describe('Longitude'),
      entries: z.array(airQualityEntrySchema).describe('Air quality data entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpenWeatherClient({
      apiKey: ctx.auth.token
    });

    let data: any;

    if (ctx.input.mode === 'forecast') {
      data = await client.getAirPollutionForecast(ctx.input.latitude, ctx.input.longitude);
    } else if (ctx.input.mode === 'history') {
      if (!ctx.input.startTimestamp || !ctx.input.endTimestamp) {
        throw new Error(
          'startTimestamp and endTimestamp are required for historical air quality data.'
        );
      }
      data = await client.getAirPollutionHistory(
        ctx.input.latitude,
        ctx.input.longitude,
        ctx.input.startTimestamp,
        ctx.input.endTimestamp
      );
    } else {
      data = await client.getCurrentAirPollution(ctx.input.latitude, ctx.input.longitude);
    }

    let entries = (data.list || []).map((entry: any) => ({
      timestamp: new Date(entry.dt * 1000).toISOString(),
      airQualityIndex: entry.main.aqi,
      components: {
        co: entry.components?.co,
        no: entry.components?.no,
        no2: entry.components?.no2,
        o3: entry.components?.o3,
        so2: entry.components?.so2,
        pm2_5: entry.components?.pm2_5,
        pm10: entry.components?.pm10,
        nh3: entry.components?.nh3
      }
    }));

    let aqiLabels: Record<number, string> = {
      1: 'Good',
      2: 'Fair',
      3: 'Moderate',
      4: 'Poor',
      5: 'Very Poor'
    };

    let output = {
      latitude: ctx.input.latitude,
      longitude: ctx.input.longitude,
      entries
    };

    let modeLabel =
      ctx.input.mode === 'forecast'
        ? 'forecast'
        : ctx.input.mode === 'history'
          ? 'historical'
          : 'current';
    let aqiSummary =
      entries.length > 0
        ? `AQI: ${entries[0].airQualityIndex} (${aqiLabels[entries[0].airQualityIndex] || 'Unknown'})`
        : 'No data';

    return {
      output,
      message: `Retrieved **${entries.length}** ${modeLabel} air quality entries. ${aqiSummary}.`
    };
  })
  .build();
