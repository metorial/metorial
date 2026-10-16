import { Slate, toolCategory } from 'slates';
import { spec } from './spec';
import {
  getAdjustedCorporateActions,
  getAggregateBars,
  getDailyOpenClose,
  getDividendsSplits,
  getGroupedDailyBars,
  getMarketReference,
  getMarketStatus,
  getOptionsChain,
  getSnapshot,
  getStockFinancials,
  getTechnicalIndicator,
  getTickerDetails,
  getTickerNews,
  getTradesQuotes,
  searchTickers
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    searchTickers,
    getTickerDetails,
    getAggregateBars,
    getDailyOpenClose,
    getSnapshot,
    getTradesQuotes,
    getTechnicalIndicator,
    getStockFinancials,
    getDividendsSplits,
    getOptionsChain,
    getTickerNews,
    getMarketStatus,
    getMarketReference,
    getGroupedDailyBars,
    getAdjustedCorporateActions
  ],
  toolCategories: [
    toolCategory({
      key: 'stocks',
      name: 'Stocks',
      description:
        'Stock prices, trades, quotes, fundamentals, news, and corporate actions, plus shared market analytics.',
      tools: [
        getDailyOpenClose,
        getTradesQuotes,
        getStockFinancials,
        getTickerNews,
        getDividendsSplits,
        getAdjustedCorporateActions,
        getGroupedDailyBars,
        getAggregateBars,
        getSnapshot,
        getTechnicalIndicator
      ]
    }),
    toolCategory({
      key: 'options',
      name: 'Options',
      description:
        'Options contracts and chain snapshots, plus shared aggregate, snapshot, and indicator tools.',
      tools: [getOptionsChain, getAggregateBars, getSnapshot, getTechnicalIndicator]
    }),
    ...[
      { key: 'forex', name: 'Forex' },
      { key: 'crypto', name: 'Crypto' },
      { key: 'indices', name: 'Indices' }
    ].map(({ key, name }) =>
      toolCategory({
        key,
        name,
        description: `${name} market data through shared aggregate, snapshot, and indicator tools. These tools also accept tickers from other asset classes.`,
        tools: [getAggregateBars, getSnapshot, getTechnicalIndicator]
      })
    )
  ],
  triggers: []
});
