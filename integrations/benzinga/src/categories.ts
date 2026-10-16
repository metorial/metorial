import { toolCategory } from 'slates';
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

export let categories = [
  toolCategory({
    key: 'news',
    name: 'Newsfeed',
    description: 'News articles, available channels, and explanations of price movements.',
    tools: [searchNewsTool, getNewsArticleTool, getNewsChannelsTool, getWiimsTool]
  }),
  toolCategory({
    key: 'calendar',
    name: 'Calendar and Signals',
    description:
      'Financial events, analyst consensus, unusual options activity, and government and insider trades.',
    tools: [
      getCalendarEventsTool,
      getConsensusRatingsTool,
      getOptionsActivityTool,
      getGovernmentTradesTool,
      getInsiderTransactionsTool
    ]
  }),
  toolCategory({
    key: 'market-data',
    name: 'Market Data',
    description: 'Delayed quotes, historical price bars, market movers, and short interest.',
    tools: [getQuotesTool, getHistoricalBarsTool, getMarketMoversTool, getShortInterestTool]
  }),
  toolCategory({
    key: 'fundamentals',
    name: 'Company Fundamentals',
    description: 'Company profiles, financial statements, and valuation data.',
    tools: [getCompanyFundamentalsTool]
  }),
  toolCategory({
    key: 'logos',
    name: 'Corporate Logos',
    description: 'Company logo URLs and brand colors.',
    tools: [getCorporateLogosTool]
  }),
  toolCategory({
    key: 'ticker-trends',
    name: 'Ticker Trends',
    description: 'Ranked securities and engagement metrics.',
    tools: [getTrendingTickersTool]
  })
];
