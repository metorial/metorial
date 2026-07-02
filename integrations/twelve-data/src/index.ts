import { Slate } from 'slates';
import { spec } from './spec';
import {
  convertCurrency,
  getAnalystData,
  getCompanyProfile,
  getDividendsAndSplits,
  getEarnings,
  getEtfDetails,
  getExchangeRate,
  getFinancialStatements,
  getMutualFundDetails,
  getPrice,
  getQuote,
  getTechnicalIndicator,
  getTimeSeries,
  listExchanges,
  searchSymbols
} from './tools';
import { inboundWebhook, priceChange } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getTimeSeries,
    getQuote,
    getPrice,
    searchSymbols,
    getExchangeRate,
    convertCurrency,
    getCompanyProfile,
    getFinancialStatements,
    getDividendsAndSplits,
    getTechnicalIndicator,
    getAnalystData,
    getEarnings,
    getEtfDetails,
    getMutualFundDetails,
    listExchanges
  ],
  triggers: [inboundWebhook, priceChange]
});
