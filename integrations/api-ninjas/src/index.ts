import { Slate } from 'slates';
import { spec } from './spec';
import {
  analyzeSentiment,
  compareTextSimilarity,
  geocodeLocation,
  getAirQuality,
  getCommodityPrice,
  getCryptoPrice,
  getExchangeRate,
  getHistoricalEvents,
  getNutrition,
  getQuotes,
  getStockPrice,
  getTrivia,
  getWeather,
  lookupAnimal,
  lookupDomain,
  lookupIp,
  lookupWord,
  searchExercises,
  validateContact
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    getStockPrice,
    getExchangeRate,
    getCommodityPrice,
    getCryptoPrice,
    getWeather,
    getAirQuality,
    geocodeLocation,
    analyzeSentiment,
    compareTextSimilarity,
    lookupWord,
    getNutrition,
    searchExercises,
    getQuotes,
    getTrivia,
    getHistoricalEvents,
    lookupAnimal,
    lookupIp,
    lookupDomain,
    validateContact
  ],
  triggers: []
});
