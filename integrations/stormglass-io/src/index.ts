import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAstronomyDataTool,
  getBioDataTool,
  getElevationTool,
  getHistoricalWeatherTool,
  getMarineDataTool,
  getSolarDataTool,
  getTideDataTool,
  getWeatherTool,
  listTideStationsTool
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    getWeatherTool,
    getHistoricalWeatherTool,
    getMarineDataTool,
    getTideDataTool,
    listTideStationsTool,
    getAstronomyDataTool,
    getSolarDataTool,
    getElevationTool,
    getBioDataTool
  ],
  triggers: []
});
