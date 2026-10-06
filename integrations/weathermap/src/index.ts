import { Slate } from 'slates';
import { spec } from './spec';
import {
  geocodeLocation,
  getAirQuality,
  getCurrentWeather,
  getForecast,
  getHistoricalWeather,
  getOneCallWeather,
  getWeatherMapTile,
  getWeatherOverview
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentWeather,
    getForecast,
    geocodeLocation,
    getAirQuality,
    getOneCallWeather,
    getHistoricalWeather,
    getWeatherOverview,
    getWeatherMapTile
  ],
  triggers: []
});
