import { Slate } from 'slates';
import { spec } from './spec';
import { getCurrentWeather, getDeviceData, listDevices } from './tools';
import { inboundWebhook, weatherDataUpdated } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [listDevices, getDeviceData, getCurrentWeather],
  triggers: [inboundWebhook, weatherDataUpdated]
});
