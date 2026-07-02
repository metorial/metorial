import { Slate } from 'slates';
import { spec } from './spec';
import {
  getApod,
  getCloseApproaches,
  getEarthImagery,
  getEpicImages,
  getFireballs,
  getMarsRoverManifest,
  getMarsRoverPhotos,
  getNasaMediaAssets,
  getNaturalEvents,
  getSpaceWeather,
  getTechPortProject,
  lookupSmallBody,
  queryExoplanets,
  searchAsteroids,
  searchNasaMedia,
  searchTle
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    getApod,
    searchAsteroids,
    getMarsRoverPhotos,
    getMarsRoverManifest,
    getEpicImages,
    getNaturalEvents,
    getSpaceWeather,
    getEarthImagery,
    searchNasaMedia,
    getNasaMediaAssets,
    searchTle,
    getTechPortProject,
    queryExoplanets,
    getCloseApproaches,
    getFireballs,
    lookupSmallBody
  ],
  triggers: [inboundWebhook]
});
