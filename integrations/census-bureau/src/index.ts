import { Slate } from 'slates';
import { spec } from './spec';
import {
  discoverDatasets,
  geocodeAddress,
  getBoundaryLayers,
  getGeocoderOptions,
  getGeography,
  lookupVariables,
  queryData,
  queryTigerweb
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    queryData,
    discoverDatasets,
    lookupVariables,
    geocodeAddress,
    getGeography,
    queryTigerweb,
    getBoundaryLayers,
    getGeocoderOptions
  ],
  triggers: []
});
