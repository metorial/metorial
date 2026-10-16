import { Slate } from 'slates';
import { categories } from './categories';
import { spec } from './spec';
import {
  getCalendarEventsTool,
  getCompanyFundamentalsTool,
  getConsensusRatingsTool,
  getCorporateLogosTool,
  getGovernmentTradesTool,
  getHistoricalBarsTool,
  getInsiderTransactionsTool,
  getMarketMoversTool,
  getNewsArticleTool,
  getNewsChannelsTool,
  getOptionsActivityTool,
  getQuotesTool,
  getShortInterestTool,
  getTrendingTickersTool,
  getWiimsTool,
  searchNewsTool
} from './tools';
export let provider = Slate.create({
  spec,
  toolCategories: categories,
  tools: [
    searchNewsTool,
    getNewsArticleTool,
    getNewsChannelsTool,
    getConsensusRatingsTool,
    getTrendingTickersTool,
    getCalendarEventsTool,
    getMarketMoversTool,
    getCompanyFundamentalsTool,
    getQuotesTool,
    getHistoricalBarsTool,
    getCorporateLogosTool,
    getOptionsActivityTool,
    getGovernmentTradesTool,
    getInsiderTransactionsTool,
    getShortInterestTool,
    getWiimsTool
  ],
  triggers: []
});
