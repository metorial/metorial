import { Slate } from 'slates';
import { spec } from './spec';
import {
  computeRouteMatrixTool,
  generateStaticMapTool,
  geocodeTool,
  geolocateTool,
  getAirQualityTool,
  getDirectionsTool,
  getElevationTool,
  getPlaceDetailsTool,
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
    getPlaceDetailsTool,
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
