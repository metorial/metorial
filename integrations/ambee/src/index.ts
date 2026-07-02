import { Slate } from 'slates';
import { spec } from './spec';
import {
  geocode,
  getAirQuality,
  getAirQualityForecast,
  getAirQualityHistory,
  getElevation,
  getNaturalDisasters,
  getNaturalDisastersHistory,
  getNdvi,
  getPollen,
  getPollenForecast,
  getPollenHistory,
  getSoil,
  getWaterVapor,
  getWeather,
  getWeatherForecast,
  getWeatherHistory,
  getWildfire,
  getWildfireRisk
} from './tools';
import { airQualityChange, inboundWebhook, naturalDisasterAlert } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getAirQuality,
    getAirQualityHistory,
    getAirQualityForecast,
    getWeather,
    getWeatherForecast,
    getWeatherHistory,
    getPollen,
    getPollenForecast,
    getPollenHistory,
    getWildfire,
    getWildfireRisk,
    getNaturalDisasters,
    getNaturalDisastersHistory,
    getSoil,
    getWaterVapor,
    getNdvi,
    getElevation,
    geocode
  ],
  triggers: [inboundWebhook, airQualityChange, naturalDisasterAlert]
});
