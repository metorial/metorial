import { Slate } from 'slates';
import { spec } from './spec';
import {
  blurImage,
  getUsage,
  recognizeBoat,
  recognizeContainer,
  recognizePlate,
  recognizeTrailer,
  recognizeUsdot,
  recognizeVin
} from './tools';
import { plateRecognized } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    recognizePlate,
    blurImage,
    recognizeVin,
    recognizeTrailer,
    recognizeUsdot,
    recognizeContainer,
    recognizeBoat,
    getUsage
  ],
  triggers: [plateRecognized]
});
