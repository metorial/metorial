import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let weatherDataUpdated = SlateTrigger.create(spec, {
  name: 'Weather Data Updated',
  key: 'weather_data_updated',
  description:
    "Triggers when any of the user's weather station devices reports new data. Emits the latest sensor readings for each device that has updated since the last poll."
})
  .input(
    z.object({
      macAddress: z.string().describe('MAC address of the device that reported new data'),
      deviceName: z.string().optional().describe('User-assigned name of the device'),
      timestamp: z.number().describe('UTC timestamp (ms) of the data reading'),
      readings: z.record(z.string(), z.any()).describe('Sensor readings from the device')
    })
  )
  .output(
    z.object({
      macAddress: z.string().describe('MAC address of the device'),
      deviceName: z.string().optional().describe('User-assigned name of the device'),
      timestamp: z.string().optional().describe('ISO timestamp of the reading'),
      temperatureF: z.number().optional().describe('Outdoor temperature (Fahrenheit)'),
      humidity: z.number().optional().describe('Outdoor humidity (%)'),
      windSpeedMph: z.number().optional().describe('Wind speed (mph)'),
      windGustMph: z.number().optional().describe('Wind gust speed (mph)'),
      windDirection: z.number().optional().describe('Wind direction (degrees)'),
      baromRelativeInHg: z.number().optional().describe('Relative barometric pressure (inHg)'),
      dailyRainIn: z.number().optional().describe('Daily rain accumulation (inches)'),
      uvIndex: z.number().optional().describe('UV index'),
      solarRadiation: z.number().optional().describe('Solar radiation (W/m^2)'),
      readings: z.record(z.string(), z.any()).describe('Full sensor readings from the device')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        applicationKey: ctx.auth.applicationKey
      });

      let devices = await client.listDevices();

      let lastTimestamps: Record<string, number> = ctx.state?.lastTimestamps || {};
      let inputs: Array<{
        macAddress: string;
        deviceName?: string;
        timestamp: number;
        readings: Record<string, any>;
      }> = [];

      for (let device of devices) {
        let lastData = device.lastData;
        if (!lastData?.dateutc) continue;

        let currentTimestamp = lastData.dateutc as number;
        let previousTimestamp = lastTimestamps[device.macAddress];

        if (!previousTimestamp || currentTimestamp > previousTimestamp) {
          inputs.push({
            macAddress: device.macAddress,
            deviceName: device.info?.name,
            timestamp: currentTimestamp,
            readings: lastData
          });
          lastTimestamps[device.macAddress] = currentTimestamp;
        }
      }

      return {
        inputs,
        updatedState: {
          lastTimestamps
        }
      };
    },

    handleEvent: async ctx => {
      let { macAddress, deviceName, timestamp, readings } = ctx.input;

      return {
        type: 'weather_data.updated',
        id: `${macAddress}-${timestamp}`,
        output: {
          macAddress,
          deviceName,
          timestamp: readings.date as string | undefined,
          temperatureF: readings.tempf as number | undefined,
          humidity: readings.humidity as number | undefined,
          windSpeedMph: readings.windspeedmph as number | undefined,
          windGustMph: readings.windgustmph as number | undefined,
          windDirection: readings.winddir as number | undefined,
          baromRelativeInHg: readings.baromrelin as number | undefined,
          dailyRainIn: readings.dailyrainin as number | undefined,
          uvIndex: readings.uv as number | undefined,
          solarRadiation: readings.solarradiation as number | undefined,
          readings
        }
      };
    }
  })
  .build();
