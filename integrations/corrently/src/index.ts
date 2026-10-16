import { Slate } from 'slates';
import { spec } from './spec';
import {
  calculateCo2Offset,
  compareChargeOrFuel,
  createEnergySchedule,
  getBestHour,
  getCo2Advice,
  getCo2Meter,
  getDispatch,
  getEnergySchedule,
  getGreenPowerIndex,
  getMarketData,
  getMeritOrder,
  getSolarPrediction,
  getStromkontoBalances,
  getStrommix,
  getTariffInfo,
  reportEnergyScheduleConsumption,
  submitMeterReading,
  updateCo2Meter,
  updateEnergyScheduleRequirements
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    getGreenPowerIndex,
    getBestHour,
    getMarketData,
    getDispatch,
    createEnergySchedule,
    getStrommix,
    getMeritOrder,
    getSolarPrediction,
    submitMeterReading,
    getStromkontoBalances,
    getTariffInfo,
    calculateCo2Offset,
    compareChargeOrFuel,
    getCo2Advice,
    getCo2Meter,
    updateCo2Meter,
    getEnergySchedule,
    updateEnergyScheduleRequirements,
    reportEnergyScheduleConsumption
  ],
  triggers: []
});
