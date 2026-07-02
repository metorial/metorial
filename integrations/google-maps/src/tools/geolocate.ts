import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleMapsClient } from '../lib/client';
import { spec } from '../spec';

let cellTowerSchema = z.object({
  cellId: z.number().describe('Unique cell tower identifier'),
  locationAreaCode: z.number().describe('Location Area Code (LAC)'),
  mobileCountryCode: z.number().describe('Mobile Country Code (MCC)'),
  mobileNetworkCode: z.number().describe('Mobile Network Code (MNC)'),
  signalStrength: z.number().optional().describe('Signal strength in dBm')
});

let wifiAccessPointSchema = z.object({
  macAddress: z.string().describe('MAC address of the Wi-Fi access point'),
  signalStrength: z.number().optional().describe('Signal strength in dBm'),
  channel: z.number().optional().describe('Wi-Fi channel number')
});

export let geolocateTool = SlateTool.create(spec, {
  name: 'Geolocate',
  key: 'geolocate',
  description: `Estimate a device's location using cell tower and/or Wi-Fi access point data. Useful for approximate positioning when GPS is unavailable. Can also fall back to IP-based geolocation.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      considerIp: z
        .boolean()
        .optional()
        .describe('Whether to fall back to IP-based location (default true)'),
      cellTowers: z
        .array(cellTowerSchema)
        .optional()
        .describe('Cell tower data for location estimation'),
      wifiAccessPoints: z
        .array(wifiAccessPointSchema)
        .optional()
        .describe('Wi-Fi access point data for location estimation')
    })
  )
  .output(
    z.object({
      latitude: z.number().describe('Estimated latitude'),
      longitude: z.number().describe('Estimated longitude'),
      accuracyMeters: z.number().describe('Accuracy radius in meters')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleMapsClient({ token: ctx.auth.token });

    let response = await client.geolocate({
      considerIp: ctx.input.considerIp,
      cellTowers: ctx.input.cellTowers,
      wifiAccessPoints: ctx.input.wifiAccessPoints
    });

    let location = response.location as { lat: number; lng: number };

    let output = {
      latitude: location.lat,
      longitude: location.lng,
      accuracyMeters: response.accuracy as number
    };

    let message = `Estimated location: **(${output.latitude.toFixed(6)}, ${output.longitude.toFixed(6)})** ±${output.accuracyMeters}m.`;

    return { output, message };
  })
  .build();
