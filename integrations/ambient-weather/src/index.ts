import { Slate } from 'slates';
import { spec } from './spec';
import { getCurrentWeather, getDeviceData, listDevices } from './tools';
export let provider = Slate.create({
  spec,
  tools: [listDevices, getDeviceData, getCurrentWeather],
  triggers: []
});
