import { toolCategory } from 'slates';
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

export let toolCategories = [
  toolCategory({
    key: 'apod',
    name: 'Astronomy Picture of the Day',
    tools: [getApod, getApodEntries]
  }),
  toolCategory({ key: 'neows', name: 'Near-Earth Objects', tools: [searchAsteroids] }),
  toolCategory({
    key: 'mars',
    name: 'Mars Rover Archive',
    tools: [getMarsRoverPhotos, getMarsRoverManifest]
  }),
  toolCategory({
    key: 'earth',
    name: 'Earth Imagery',
    tools: [getEpicImages, getEarthImagery]
  }),
  toolCategory({
    key: 'eonet',
    name: 'Natural Events',
    tools: [getNaturalEvents, getNaturalEventCatalog]
  }),
  toolCategory({ key: 'donki', name: 'Space Weather', tools: [getSpaceWeather] }),
  toolCategory({
    key: 'media',
    name: 'Image and Video Library',
    tools: [searchNasaMedia, getNasaMediaAssets, getNasaMediaMetadata]
  }),
  toolCategory({ key: 'tle', name: 'Satellite Orbits', tools: [searchTle] }),
  toolCategory({ key: 'techport', name: 'Technology Projects', tools: [getTechPortProject] }),
  toolCategory({ key: 'exoplanets', name: 'Exoplanet Archive', tools: [queryExoplanets] }),
  toolCategory({
    key: 'ssd',
    name: 'Solar System Dynamics',
    tools: [getCloseApproaches, queryCloseApproaches, getFireballs, lookupSmallBody]
  })
];
