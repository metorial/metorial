import { toolCategory } from 'slates';
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

export let toolCategories = [
  toolCategory({
    key: 'finance',
    name: 'Finance',
    description: 'Stock, commodity, crypto, and currency data.',
    tools: [getStockPrice, getExchangeRate, getCommodityPrice, getCryptoPrice, convertCurrency]
  }),
  toolCategory({
    key: 'places',
    name: 'Places and Weather',
    description: 'Geocoding, countries, cities, air quality, weather, and local time.',
    tools: [
      getWeather,
      getWeatherForecast,
      getAirQuality,
      geocodeLocation,
      searchCountries,
      searchCities,
      getWorldTime
    ]
  }),
  toolCategory({
    key: 'text',
    name: 'Text and Language',
    description: 'Sentiment, text similarity, definitions, and synonyms.',
    tools: [analyzeSentiment, compareTextSimilarity, lookupWord]
  }),
  toolCategory({
    key: 'health',
    name: 'Health and Wellness',
    description: 'Nutrition and exercise reference data.',
    tools: [getNutrition, searchExercises]
  }),
  toolCategory({
    key: 'reference',
    name: 'Entertainment and Reference',
    description: 'Quotes, trivia, historical events, holidays, and animal reference data.',
    tools: [getQuotes, getTrivia, getHistoricalEvents, getHolidays, lookupAnimal]
  }),
  toolCategory({
    key: 'internet',
    name: 'Internet and Contact Validation',
    description: 'IP geolocation, domain records, and email and phone validation.',
    tools: [lookupIp, lookupDomain, validateContact]
  })
];
