import { Slate } from 'slates';
import { spec } from './spec';
import {
  getCalendarEventsTool,
  getCompanyFundamentalsTool,
  getCorporateLogosTool,
  getGovernmentTradesTool,
  getHistoricalBarsTool,
  getInsiderTransactionsTool,
  getMarketMoversTool,
  getOptionsActivityTool,
  getQuotesTool,
  getShortInterestTool,
  getWiimsTool,
  searchNewsTool
} from './tools';
import { newsWebhookTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    searchNewsTool,
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
  triggers: [newsWebhookTrigger]
});
