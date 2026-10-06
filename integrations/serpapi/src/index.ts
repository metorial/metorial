import { Slate } from 'slates';
import { spec } from './spec';
import {
  accountInfoTool,
  autocompleteTool,
  flightsSearchTool,
  getSearchTool,
  imageSearchTool,
  jobsSearchTool,
  locationsLookupTool,
  mapsSearchTool,
  newsSearchTool,
  scholarSearchTool,
  shoppingSearchTool,
  trendsSearchTool,
  videoSearchTool,
  webSearchTool
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    webSearchTool,
    imageSearchTool,
    newsSearchTool,
    videoSearchTool,
    shoppingSearchTool,
    mapsSearchTool,
    flightsSearchTool,
    scholarSearchTool,
    trendsSearchTool,
    jobsSearchTool,
    autocompleteTool,
    locationsLookupTool,
    accountInfoTool,
    getSearchTool
  ],
  triggers: []
});
