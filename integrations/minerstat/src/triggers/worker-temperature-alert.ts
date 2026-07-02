import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { MonitoringClient } from '../lib/client';
import { spec } from '../spec';

export let workerTemperatureAlertTrigger = SlateTrigger.create(spec, {
  name: 'Worker Temperature Alert',
  key: 'worker_temperature_alert',
  description:
    'Fires when any GPU in any worker exceeds a configurable temperature threshold. Polls worker hardware data and checks temperatures against the defined limit. Useful for preventing thermal damage and triggering automated responses.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      workerName: z.string().describe('Name of the worker with high temperature'),
      deviceName: z.string().describe('Name of the overheating device'),
      temperature: z.number().describe('Current temperature in Celsius'),
      threshold: z.number().describe('Temperature threshold that was exceeded')
    })
  )
  .output(
    z.object({
      workerName: z.string().describe('Name of the affected worker'),
      deviceName: z.string().describe('Name of the overheating GPU/device'),
      temperature: z.number().describe('Current temperature in Celsius'),
      threshold: z.number().describe('Threshold that was exceeded'),
      fanSpeed: z.number().describe('Current fan speed (% or RPM)'),
      powerConsumption: z.number().describe('Current power consumption in watts')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new MonitoringClient({ accessKey: ctx.auth.accessKey });
      let workers = await client.listWorkers();

      let threshold = ctx.state?.temperatureThreshold ?? 80;
      let previousAlerts: Record<string, boolean> = ctx.state?.activeAlerts ?? {};
      let currentAlerts: Record<string, boolean> = {};
      let inputs: Array<{
        eventId: string;
        workerName: string;
        deviceName: string;
        temperature: number;
        threshold: number;
      }> = [];

      for (let [name, data] of Object.entries(workers)) {
        let hardware = (data as any)?.hardware ?? [];
        for (let i = 0; i < hardware.length; i++) {
          let device = hardware[i];
          let alertKey = `${name}-${i}-${device?.name ?? i}`;
          let temp = device?.temperature ?? 0;

          if (temp >= threshold) {
            currentAlerts[alertKey] = true;

            if (!previousAlerts[alertKey]) {
              inputs.push({
                eventId: `${alertKey}-${Date.now()}`,
                workerName: name,
                deviceName: device?.name ?? `Device ${i}`,
                temperature: temp,
                threshold
              });
            }
          }
        }
      }

      return {
        inputs,
        updatedState: {
          activeAlerts: currentAlerts,
          temperatureThreshold: threshold
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'worker.temperature_alert',
        id: ctx.input.eventId,
        output: {
          workerName: ctx.input.workerName,
          deviceName: ctx.input.deviceName,
          temperature: ctx.input.temperature,
          threshold: ctx.input.threshold,
          fanSpeed: 0,
          powerConsumption: 0
        }
      };
    }
  })
  .build();
