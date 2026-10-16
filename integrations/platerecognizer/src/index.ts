import { Slate } from 'slates';
import { toolCategories } from './categories';
import { spec } from './spec';
import {
  blurImage,
  blurImageFile,
  getUsage,
  listLicenses,
  recognizeBoat,
  recognizeContainer,
  recognizePlate,
  recognizeText,
  recognizeTrailer,
  recognizeUsdot,
  recognizeVin
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    recognizePlate,
    blurImage,
    blurImageFile,
    recognizeVin,
    recognizeTrailer,
    recognizeUsdot,
    recognizeContainer,
    recognizeBoat,
    getUsage,
    recognizeText,
    listLicenses
  ],
  toolCategories,
  triggers: []
});
