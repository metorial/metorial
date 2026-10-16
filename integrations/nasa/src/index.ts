import { Slate } from 'slates';
import { toolCategories } from './categories';
import { spec } from './spec';
import {
  getApod,
  getApodEntries,
  getCloseApproaches,
  getEarthImagery,
  getEpicImages,
  getFireballs,
  getMarsRoverManifest,
  getMarsRoverPhotos,
  getNasaMediaAssets,
  getNasaMediaMetadata,
  getNaturalEventCatalog,
  getNaturalEvents,
  getSpaceWeather,
  getTechPortProject,
  lookupSmallBody,
  queryCloseApproaches,
  queryExoplanets,
  searchAsteroids,
  searchNasaMedia,
  searchTle
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    getApod,
    getApodEntries,
    searchAsteroids,
    getMarsRoverPhotos,
    getMarsRoverManifest,
    getEpicImages,
    getNaturalEvents,
    getNaturalEventCatalog,
    getNasaMediaMetadata,
    queryCloseApproaches,
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
  toolCategories,
  triggers: []
});
