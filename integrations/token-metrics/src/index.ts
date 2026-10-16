import { Slate } from 'slates';
import { spec } from './spec';
import {
  askAiAgent,
  getAiReports,
  getCryptoInvestors,
  getGradeHistory,
  getGrades,
  getIndices,
  getMarketMetrics,
  getMoonshotTokens,
  getPriceData,
  getPricePrediction,
  getQuantMetrics,
  getSentiment,
  getTechnicalAnalysis,
  getTmGrades,
  getTopTokens,
  getTradingSignals,
  searchTokens
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    searchTokens,
    getTopTokens,
    getPriceData,
    getGrades,
    getTradingSignals,
    getMarketMetrics,
    getSentiment,
    getTechnicalAnalysis,
    getQuantMetrics,
    getPricePrediction,
    getAiReports,
    getIndices,
    getCryptoInvestors,
    askAiAgent,
    getTmGrades,
    getGradeHistory,
    getMoonshotTokens
  ],
  triggers: []
});
