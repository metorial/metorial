import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAdvancedPvPower,
  getGridAggregations,
  getHorizonAngle,
  getRadiationAndWeather,
  getRooftopPvPower,
  getTmyData,
  listPvPowerSites,
  managePvPowerSite
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    getRadiationAndWeather,
    getRooftopPvPower,
    getAdvancedPvPower,
    getTmyData,
    getGridAggregations,
    managePvPowerSite,
    listPvPowerSites,
    getHorizonAngle
  ],
  triggers: []
});
