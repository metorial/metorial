import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let airQualityChange = SlateTrigger.create(spec, {
  name: 'Air Quality Change',
  key: 'air_quality_change',
  description:
    'Monitors air quality at a specified location and triggers when the AQI or category changes from the last known state.'
})
  .input(
    z.object({
      aqi: z.number().describe('Current AQI value'),
      previousAqi: z.number().optional().describe('Previous AQI value'),
      category: z.string().optional().describe('Current AQI category'),
      previousCategory: z.string().optional().describe('Previous AQI category'),
      lat: z.number().optional().describe('Latitude'),
      lng: z.number().optional().describe('Longitude'),
      city: z.string().optional().describe('City name'),
      pollutant: z.string().optional().describe('Major pollutant'),
      updatedAt: z.string().optional().describe('Timestamp of the reading'),
      co: z.number().optional(),
      no2: z.number().optional(),
      ozone: z.number().optional(),
      pm10: z.number().optional(),
      pm25: z.number().optional(),
      so2: z.number().optional()
    })
  )
  .output(
    z.object({
      aqi: z.number().describe('Current AQI value'),
      previousAqi: z.number().optional().describe('Previous AQI value'),
      category: z
        .string()
        .optional()
        .describe(
          'Current AQI category (Good, Moderate, Unhealthy for Sensitive Groups, Unhealthy, Very Unhealthy, Hazardous)'
        ),
      previousCategory: z.string().optional().describe('Previous AQI category'),
      lat: z.number().optional().describe('Latitude'),
      lng: z.number().optional().describe('Longitude'),
      city: z.string().optional().describe('City name'),
      pollutant: z.string().optional().describe('Major pollutant'),
      updatedAt: z.string().optional().describe('Timestamp of the reading'),
      co: z.number().optional().describe('Carbon monoxide (ppm)'),
      no2: z.number().optional().describe('Nitrogen dioxide (ppb)'),
      ozone: z.number().optional().describe('Ozone (ppb)'),
      pm10: z.number().optional().describe('PM10 (µg/m³)'),
      pm25: z.number().optional().describe('PM2.5 (µg/m³)'),
      so2: z.number().optional().describe('Sulfur dioxide (ppb)')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        language: ctx.config.language
      });

      let lat = ctx.state?.lat as number | undefined;
      let lng = ctx.state?.lng as number | undefined;

      if (lat === undefined || lng === undefined) {
        return { inputs: [], updatedState: ctx.state || {} };
      }

      let result = await client.getAirQualityByLatLng(lat, lng);
      let stations = result.stations || [];

      if (stations.length === 0) {
        return { inputs: [], updatedState: ctx.state || {} };
      }

      let station = stations[0];
      let currentAqi = station.AQI;
      let currentCategory = station.aqiInfo?.category;
      let previousAqi = ctx.state?.lastAqi as number | undefined;
      let previousCategory = ctx.state?.lastCategory as string | undefined;

      let hasChanged =
        previousAqi !== undefined &&
        (currentAqi !== previousAqi || currentCategory !== previousCategory);

      let updatedState = {
        ...ctx.state,
        lat,
        lng,
        lastAqi: currentAqi,
        lastCategory: currentCategory,
        lastChecked: new Date().toISOString()
      };

      if (!hasChanged) {
        return { inputs: [], updatedState };
      }

      return {
        inputs: [
          {
            aqi: currentAqi,
            previousAqi,
            category: currentCategory,
            previousCategory,
            lat: station.lat,
            lng: station.lng,
            city: station.city,
            pollutant: station.aqiInfo?.pollutant,
            updatedAt: station.updatedAt,
            co: station.CO,
            no2: station.NO2,
            ozone: station.OZONE,
            pm10: station.PM10,
            pm25: station.PM25,
            so2: station.SO2
          }
        ],
        updatedState
      };
    },

    handleEvent: async ctx => {
      let changeType =
        ctx.input.previousCategory !== ctx.input.category ? 'category_changed' : 'aqi_changed';

      return {
        type: `air_quality.${changeType}`,
        id: `aq-${ctx.input.lat}-${ctx.input.lng}-${ctx.input.updatedAt || Date.now()}`,
        output: {
          aqi: ctx.input.aqi,
          previousAqi: ctx.input.previousAqi,
          category: ctx.input.category,
          previousCategory: ctx.input.previousCategory,
          lat: ctx.input.lat,
          lng: ctx.input.lng,
          city: ctx.input.city,
          pollutant: ctx.input.pollutant,
          updatedAt: ctx.input.updatedAt,
          co: ctx.input.co,
          no2: ctx.input.no2,
          ozone: ctx.input.ozone,
          pm10: ctx.input.pm10,
          pm25: ctx.input.pm25,
          so2: ctx.input.so2
        }
      };
    }
  })
  .build();
