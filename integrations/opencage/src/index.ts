import { Slate } from 'slates';
import { spec } from './spec';
import { batchGeocode, forwardGeocode, reverseGeocode } from './tools';

export let provider = Slate.create({
  spec,
  tools: [forwardGeocode, reverseGeocode, batchGeocode],
  triggers: []
});
