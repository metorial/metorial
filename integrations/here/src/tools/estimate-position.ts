import { SlateTool } from 'slates';
import { z } from 'zod';
import { HereClient } from '../lib/client';
import { spec } from '../spec';

let wlanMeasurementSchema = z.object({
  mac: z.string().describe('Wi-Fi access point MAC address (e.g. "A0:EC:F9:1E:32:C1")')
});

let gsmCellSchema = z.object({
  mcc: z.number().describe('Mobile Country Code'),
  mnc: z.number().describe('Mobile Network Code'),
  lac: z.number().describe('Location Area Code'),
  cid: z.number().describe('Cell ID')
});

let lteCellSchema = z.object({
  mcc: z.number().describe('Mobile Country Code'),
  mnc: z.number().describe('Mobile Network Code'),
  cid: z.number().describe('E-UTRAN Cell Identifier')
});

export let estimatePosition = SlateTool.create(spec, {
  name: 'Estimate Position',
  key: 'estimate_position',
  description: `Estimate a device's geographic position from radio network signals (Wi-Fi access points, GSM cell towers, or LTE cell towers). Returns latitude, longitude, and accuracy radius.
Useful for indoor positioning, device tracking without GPS, and approximate location from network data.`,
  instructions: [
    'Provide at least one type of measurement: wlan (Wi-Fi), gsm, or lte.',
    'More measurements improve accuracy — submit multiple Wi-Fi APs or cell towers when available.',
    'Use fallback "area" if you want a coarser result when precise positioning fails.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      wlan: z
        .array(wlanMeasurementSchema)
        .optional()
        .describe('Wi-Fi access point measurements'),
      gsm: z.array(gsmCellSchema).optional().describe('GSM cell tower measurements'),
      lte: z.array(lteCellSchema).optional().describe('LTE cell tower measurements'),
      fallback: z
        .enum(['area', 'any', 'singleWifi'])
        .optional()
        .describe('Fallback mode when precise positioning is unavailable')
    })
  )
  .output(
    z.object({
      latitude: z.number().describe('Estimated latitude'),
      longitude: z.number().describe('Estimated longitude'),
      accuracy: z.number().describe('Position accuracy radius in meters')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HereClient({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let response = await client.locate({
      wlan: ctx.input.wlan,
      gsm: ctx.input.gsm,
      lte: ctx.input.lte,
      fallback: ctx.input.fallback
    });

    let location = response.location || {};

    return {
      output: {
        latitude: location.lat,
        longitude: location.lng,
        accuracy: location.accuracy
      },
      message: `Estimated position: **(${location.lat}, ${location.lng})** with accuracy **${location.accuracy}m**.`
    };
  })
  .build();
