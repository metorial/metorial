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
  managePvPowerSite,
  submitSiteMeasurements
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
    getHorizonAngle,
    submitSiteMeasurements
  ],
  triggers: []
});
