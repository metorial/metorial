import { Slate } from 'slates';
import { toolCategories } from './categories';
import { spec } from './spec';
import {
  analyzeSentiment,
  compareTextSimilarity,
  convertCurrency,
  geocodeLocation,
  getAirQuality,
  getCommodityPrice,
  getCryptoPrice,
  getExchangeRate,
  getHistoricalEvents,
  getHolidays,
  getNutrition,
  getQuotes,
  getStockPrice,
  getTrivia,
  getWeather,
  getWeatherForecast,
  getWorldTime,
  lookupAnimal,
  lookupDomain,
  lookupIp,
  lookupWord,
  searchCities,
  searchCountries,
  searchExercises,
  validateContact
} from './tools';

export let provider = Slate.create({
  spec,
  toolCategories,
  tools: [
    convertCurrency,
    searchCountries,
    searchCities,
    getWorldTime,
    getHolidays,
    getWeatherForecast,
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
