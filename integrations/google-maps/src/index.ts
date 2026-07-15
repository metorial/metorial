import { Slate } from 'slates';
import { spec } from './spec';
import {
  autocompleteTool,
  computeRouteMatrixTool,
  generateStaticMapTool,
  geocodeTool,
  geolocateTool,
  getAirQualityTool,
  getDirectionsTool,
  getElevationTool,
  getPlaceDetailsTool,
  getPlacePhotoTool,
  getTimezoneTool,
  searchPlacesTool,
  snapToRoadsTool,
  validateAddressTool
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    geocodeTool,
    validateAddressTool,
    searchPlacesTool,
    autocompleteTool,
    getPlaceDetailsTool,
    getPlacePhotoTool,
    getDirectionsTool,
    computeRouteMatrixTool,
    getElevationTool,
    getTimezoneTool,
    getAirQualityTool,
    snapToRoadsTool,
    generateStaticMapTool,
    geolocateTool
  ],
  triggers: [inboundWebhook]
});
