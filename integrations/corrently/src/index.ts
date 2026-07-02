import { Slate } from 'slates';
import { spec } from './spec';
import {
  calculateCo2Offset,
  createEnergySchedule,
  getBestHour,
  getDispatch,
  getGreenPowerIndex,
  getMarketData,
  getMeritOrder,
  getSolarPrediction,
  getStromkontoBalances,
  getStrommix,
  getTariffInfo,
  submitMeterReading
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

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
    calculateCo2Offset
  ],
  triggers: [inboundWebhook]
});
