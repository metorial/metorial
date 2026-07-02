import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let analogSensorReading = SlateTrigger.create(spec, {
  name: 'Analog Sensor Reading',
  key: 'analog_sensor_reading',
  description:
    'Periodically polls the analog pin (A0) on a Bolt device and triggers with the sensor reading. Useful for monitoring temperature, light, or other analog sensors connected to the device.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique identifier for this reading event'),
      analogValue: z.number().describe('The analog sensor value (0–1023)'),
      readAt: z.string().describe('ISO timestamp of when the reading was taken')
    })
  )
  .output(
    z.object({
      deviceName: z.string().describe('The device ID of the Bolt module'),
      analogValue: z.number().describe('The analog sensor reading (0–1023)'),
      pin: z.string().describe('The analog pin that was read'),
      readAt: z.string().describe('ISO timestamp of when the reading was taken')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        deviceName: ctx.auth.deviceName
      });

      let response = await client.analogRead('A0');
      let now = new Date().toISOString();

      if (response.success !== '1') {
        return {
          inputs: [],
          updatedState: ctx.state
        };
      }

      let analogValue = Number.parseInt(response.value, 10);

      return {
        inputs: [
          {
            eventId: `${ctx.auth.deviceName}-analog-${now}`,
            analogValue,
            readAt: now
          }
        ],
        updatedState: {
          lastReadAt: now,
          lastValue: analogValue
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'sensor.reading',
        id: ctx.input.eventId,
        output: {
          deviceName: ctx.auth.deviceName,
          analogValue: ctx.input.analogValue,
          pin: 'A0',
          readAt: ctx.input.readAt
        }
      };
    }
  })
  .build();
