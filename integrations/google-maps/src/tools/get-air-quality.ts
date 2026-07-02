import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleMapsClient } from '../lib/client';
import { spec } from '../spec';

let aqiIndexSchema = z.object({
  code: z.string().optional().describe('Index code (e.g. "uaqi", "usa_epa")'),
  displayName: z.string().optional().describe('Display name of the index'),
  aqi: z.number().optional().describe('Air quality index value'),
  aqiDisplay: z.string().optional().describe('Formatted AQI value'),
  category: z.string().optional().describe('AQI category (e.g. "Good air quality")'),
  dominantPollutant: z.string().optional().describe('Dominant pollutant code')
});

let pollutantSchema = z.object({
  code: z.string().optional().describe('Pollutant code (e.g. "pm25", "o3")'),
  displayName: z.string().optional().describe('Pollutant display name'),
  fullName: z.string().optional().describe('Full pollutant name'),
  concentrationValue: z.number().optional().describe('Concentration value'),
  concentrationUnits: z.string().optional().describe('Concentration units')
});

export let getAirQualityTool = SlateTool.create(spec, {
  name: 'Get Air Quality',
  key: 'get_air_quality',
  description: `Get current air quality data for a location. Returns air quality indices (Universal AQI, local AQIs), pollutant concentrations (PM2.5, PM10, O3, NO2, etc.), dominant pollutant, and health recommendations for various populations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      latitude: z.number().describe('Latitude of the location'),
      longitude: z.number().describe('Longitude of the location'),
      languageCode: z.string().optional().describe('Language for results (e.g. "en")')
    })
  )
  .output(
    z.object({
      dateTime: z.string().optional().describe('Timestamp of the air quality data'),
      regionCode: z.string().optional().describe('Region code'),
      indexes: z.array(aqiIndexSchema).describe('Air quality index values'),
      pollutants: z.array(pollutantSchema).describe('Individual pollutant data'),
      healthRecommendations: z
        .object({
          generalPopulation: z.string().optional(),
          elderly: z.string().optional(),
          lungDiseasePopulation: z.string().optional(),
          heartDiseasePopulation: z.string().optional(),
          athletes: z.string().optional(),
          pregnantWomen: z.string().optional(),
          children: z.string().optional()
        })
        .optional()
        .describe('Health recommendations for different populations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleMapsClient({ token: ctx.auth.token });

    let response = await client.getAirQuality({
      latitude: ctx.input.latitude,
      longitude: ctx.input.longitude,
      languageCode: ctx.input.languageCode
    });

    let rawIndexes = (response.indexes as Record<string, unknown>[]) || [];
    let rawPollutants = (response.pollutants as Record<string, unknown>[]) || [];
    let rawHealth = (response.healthRecommendations as Record<string, string>) || {};

    let indexes = rawIndexes.map(idx => ({
      code: idx.code as string | undefined,
      displayName: idx.displayName as string | undefined,
      aqi: idx.aqi as number | undefined,
      aqiDisplay: idx.aqiDisplay as string | undefined,
      category: idx.category as string | undefined,
      dominantPollutant: idx.dominantPollutant as string | undefined
    }));

    let pollutants = rawPollutants.map(p => {
      let concentration = p.concentration as Record<string, unknown> | undefined;
      return {
        code: p.code as string | undefined,
        displayName: p.displayName as string | undefined,
        fullName: p.fullName as string | undefined,
        concentrationValue: concentration?.value as number | undefined,
        concentrationUnits: concentration?.units as string | undefined
      };
    });

    let output = {
      dateTime: response.dateTime as string | undefined,
      regionCode: response.regionCode as string | undefined,
      indexes,
      pollutants,
      healthRecommendations: Object.keys(rawHealth).length > 0 ? rawHealth : undefined
    };

    let universalAqi = indexes.find(i => i.code === 'uaqi');
    let message = universalAqi
      ? `Air quality at (${ctx.input.latitude}, ${ctx.input.longitude}): **${universalAqi.category}** (AQI: ${universalAqi.aqi}). Dominant pollutant: ${universalAqi.dominantPollutant || 'N/A'}.`
      : `Retrieved air quality data for (${ctx.input.latitude}, ${ctx.input.longitude}).`;

    return { output, message };
  })
  .build();
