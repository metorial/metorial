import { Slate } from 'slates';
import { spec } from './spec';
import {
  getCoinDetails,
  getCoinPrice,
  getCoinPriceHistory,
  getGlobalStats,
  getTrendingCoins,
  listCoins,
  listReferenceCurrencies,
  searchCoins
} from './tools';
import { coinPriceChangeTrigger, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    searchCoins,
    listCoins,
    getCoinDetails,
    getCoinPrice,
    getCoinPriceHistory,
    getTrendingCoins,
    getGlobalStats,
    listReferenceCurrencies
  ],
  triggers: [inboundWebhook, coinPriceChangeTrigger]
});
