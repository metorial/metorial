import { Slate } from 'slates';
import { spec } from './spec';
import { forwardGeocode, reverseGeocode } from './tools';

export let provider = Slate.create({
  spec,
  tools: [forwardGeocode, reverseGeocode],
  triggers: []
});
