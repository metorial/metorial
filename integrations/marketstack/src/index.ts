import { Slate } from 'slates';
import { spec } from './spec';
import {
  downloadCatalog,
  getAccountsPayableFrames,
  getAnalystRatings,
  getCommodities,
  getCompanyProfile,
  getCompanyRatings,
  getEodPrices,
  getEtfHoldings,
  getGovernmentBonds,
  getIntradayPrices,
  getMarketIndex,
  getMarketIndices,
  getRealtimePrices,
  getSecFinancialData,
  getSplitsAndDividends,
  getTickerDetails,
  listCurrencies,
  listEtfs,
  listExchanges,
  listTimezones,
  searchSecFilings,
  searchTickers
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    downloadCatalog,
    getAccountsPayableFrames,
    getCompanyProfile,
    getMarketIndex,
    getRealtimePrices,
    listCurrencies,
    listEtfs,
    listTimezones,
    getEodPrices,
    getIntradayPrices,
    searchTickers,
    getTickerDetails,
    getSplitsAndDividends,
    listExchanges,
    getCommodities,
    getMarketIndices,
    getGovernmentBonds,
    getEtfHoldings,
    getAnalystRatings,
    getCompanyRatings,
    searchSecFilings,
    getSecFinancialData
  ],
  triggers: []
});
