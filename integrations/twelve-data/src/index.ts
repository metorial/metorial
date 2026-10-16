import { Slate } from 'slates';
import { spec } from './spec';
import {
  convertCurrency,
  getAnalystData,
  getApiUsage,
  getCompanyProfile,
  getDividendsAndSplits,
  getEarnings,
  getEarningsCalendar,
  getEarningsHistory,
  getEndOfDayPrice,
  getEtfDetails,
  getExchangeRate,
  getFinancialStatements,
  getFundData,
  getMarketState,
  getMutualFundDetails,
  getPrice,
  getQuote,
  getTechnicalIndicator,
  getTimeSeries,
  listExchanges,
  listTechnicalIndicators,
  searchSymbols
} from './tools';
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
    listExchanges,
    getEndOfDayPrice,
    getApiUsage,
    getMarketState,
    getEarningsCalendar,
    getEarningsHistory,
    listTechnicalIndicators,
    getFundData
  ],
  triggers: []
});
