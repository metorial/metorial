import { z } from 'zod';
import type { ScheduleResponse } from './client';

export let optimizationMode = z.enum(['price', 'solar', 'emission', 'comfort']);
export let scheduleId = z.string().describe('Schedule ID returned by create_energy_schedule.');
export let scheduleOutput = z.object({
  scheduleId: z.string().optional(),
  status: z.string().optional(),
  currentRecommendation: z.unknown().optional(),
  schedule: z.array(
    z.object({
      epochTime: z.number().optional().describe('Unix timestamp in seconds'),
      timeStamp: z.number().optional().describe('Timestamp in milliseconds'),
      active: z.boolean().optional().describe('Whether the device should be active'),
      gsi: z.number().optional(),
      price: z.number().optional(),
      co2: z.number().optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      state: z.string().optional(),
      expectedLoad: z.number().optional(),
      expectedEnergy: z.number().optional()
    })
  ),
  raw: z.unknown().describe('Complete provider response, including progress and requirements')
});

export let mapSchedule = (result: ScheduleResponse) => {
  let details = result.schedule;
  let slots = Array.isArray(details) ? details : (details?.timeSlots ?? []);
  return {
    scheduleId: result.scheduleId,
    status: result.status,
    currentRecommendation: Array.isArray(details) ? undefined : details?.currentRecommendation,
    schedule: slots.map(slot => ({
      epochTime:
        slot.epochtime ?? (slot.startTime ? Date.parse(slot.startTime) / 1000 : undefined),
      timeStamp: slot.timeStamp ?? (slot.startTime ? Date.parse(slot.startTime) : undefined),
      active: slot.active ?? (slot.state === undefined ? undefined : slot.state === 'on'),
      gsi: slot.gsi ?? slot.metrics?.gsi,
      price: slot.price ?? slot.metrics?.price,
      co2: slot.co2 ?? slot.metrics?.co2_g_standard,
      startTime: slot.startTime,
      endTime: slot.endTime,
      state: slot.state,
      expectedLoad: slot.expectedLoad,
      expectedEnergy: slot.expectedEnergy
    })),
    raw: result
  };
};
