import { createAxios } from 'slates';
import type {
  AdvancedPvParams,
  AggregationParams,
  HistoricAdvancedPvParams,
  HistoricForecastRadiationParams,
  HistoricForecastRooftopPvParams,
  HistoricParams,
  HistoricRooftopPvParams,
  HorizonAngleParams,
  PvPowerSiteCreateParams,
  PvPowerSitesListParams,
  PvPowerSiteUpdateParams,
  RadiationWeatherParams,
  RooftopPvParams,
  TmyAdvancedPvParams,
  TmyRadiationWeatherParams,
  TmyRooftopPvParams
} from './types';

let toSnakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

let buildParams = (
  params: Record<string, unknown>
): Record<string, string | number | boolean> => {
  let result: Record<string, string | number | boolean> = {};
  for (let [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    let snakeKey = toSnakeCase(key);
    if (Array.isArray(value)) {
      result[snakeKey] = value.join(',');
    } else {
      result[snakeKey] = value as string | number | boolean;
    }
  }
  return result;
};

let buildBodyParams = (params: Record<string, unknown>): Record<string, unknown> => {
  let result: Record<string, unknown> = {};
  for (let [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    let snakeKey = toSnakeCase(key);
    result[snakeKey] = value;
  }
  return result;
};

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.solcast.com.au',
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/json'
      }
    });
  }

  // ---- Radiation & Weather ----

  async getForecastRadiationAndWeather(params: RadiationWeatherParams): Promise<any> {
    let response = await this.axios.get('/data/forecast/radiation_and_weather', {
      params: buildParams({ ...params, format: 'json' })
    });
    return response.data;
  }

  async getLiveRadiationAndWeather(params: RadiationWeatherParams): Promise<any> {
    let response = await this.axios.get('/data/live/radiation_and_weather', {
      params: buildParams({ ...params, format: 'json' })
    });
    return response.data;
  }

  async getHistoricRadiationAndWeather(params: HistoricParams): Promise<any> {
    let response = await this.axios.get('/data/historic/radiation_and_weather', {
      params: buildParams({ ...params, format: 'json' })
    });
    return response.data;
  }

  async getHistoricForecastRadiationAndWeather(
    params: HistoricForecastRadiationParams
  ): Promise<any> {
    let response = await this.axios.get('/data/historic_forecast/radiation_and_weather', {
      params: buildParams({ ...params, format: 'json' })
    });
    return response.data;
  }

  // ---- Rooftop PV Power ----

  async getForecastRooftopPvPower(params: RooftopPvParams): Promise<any> {
    let response = await this.axios.get('/data/forecast/rooftop_pv_power', {
      params: buildParams({ ...params, format: 'json' })
    });
    return response.data;
  }

  async getLiveRooftopPvPower(params: RooftopPvParams): Promise<any> {
    let response = await this.axios.get('/data/live/rooftop_pv_power', {
      params: buildParams({ ...params, format: 'json' })
    });
    return response.data;
  }

  async getHistoricRooftopPvPower(params: HistoricRooftopPvParams): Promise<any> {
    let response = await this.axios.get('/data/historic/rooftop_pv_power', {
      params: buildParams({ ...params, format: 'json' })
    });
    return response.data;
  }

  async getHistoricForecastRooftopPvPower(
    params: HistoricForecastRooftopPvParams
  ): Promise<any> {
    let response = await this.axios.get('/data/historic_forecast/rooftop_pv_power', {
      params: buildParams({ ...params, format: 'json' })
    });
    return response.data;
  }

  // ---- Advanced PV Power ----

  async getForecastAdvancedPvPower(params: AdvancedPvParams): Promise<any> {
    let response = await this.axios.get('/data/forecast/advanced_pv_power', {
      params: buildParams({ ...params, format: 'json' })
    });
    return response.data;
  }

  async getLiveAdvancedPvPower(params: AdvancedPvParams): Promise<any> {
    let response = await this.axios.get('/data/live/advanced_pv_power', {
      params: buildParams({ ...params, format: 'json' })
    });
    return response.data;
  }

  async getHistoricAdvancedPvPower(params: HistoricAdvancedPvParams): Promise<any> {
    let response = await this.axios.get('/data/historic/advanced_pv_power', {
      params: buildParams({ ...params, format: 'json' })
    });
    return response.data;
  }

  // ---- TMY ----

  async getTmyRadiationAndWeather(params: TmyRadiationWeatherParams): Promise<any> {
    let response = await this.axios.get('/data/tmy/radiation_and_weather', {
      params: buildParams({ ...params, format: 'json' })
    });
    return response.data;
  }

  async getTmyRooftopPvPower(params: TmyRooftopPvParams): Promise<any> {
    let response = await this.axios.get('/data/tmy/rooftop_pv_power', {
      params: buildParams({ ...params, format: 'json' })
    });
    return response.data;
  }

  async getTmyAdvancedPvPower(params: TmyAdvancedPvParams): Promise<any> {
    let response = await this.axios.get('/data/tmy/advanced_pv_power', {
      params: buildParams({ ...params, format: 'json' })
    });
    return response.data;
  }

  // ---- Grid Aggregations ----

  async getLiveAggregations(params: AggregationParams): Promise<any> {
    let response = await this.axios.get('/data/live/aggregations', {
      params: buildParams({ ...params, format: 'json' })
    });
    return response.data;
  }

  async getForecastAggregations(params: AggregationParams): Promise<any> {
    let response = await this.axios.get('/data/forecast/aggregations', {
      params: buildParams({ ...params, format: 'json' })
    });
    return response.data;
  }

  // ---- Horizon Angle ----

  async getHorizonAngle(params: HorizonAngleParams): Promise<any> {
    let response = await this.axios.get('/data/geographic/horizon_angle', {
      params: buildParams({ ...params, format: 'json' })
    });
    return response.data;
  }

  // ---- PV Power Sites ----

  async listPvPowerSites(params?: PvPowerSitesListParams): Promise<any> {
    let response = await this.axios.get('/resources/pv_power_sites', {
      params: params ? buildParams(params as Record<string, unknown>) : undefined
    });
    return response.data;
  }

  async getPvPowerSite(resourceId: string): Promise<any> {
    let response = await this.axios.get('/resources/pv_power_site', {
      params: { resource_id: resourceId }
    });
    return response.data;
  }

  async createPvPowerSite(params: PvPowerSiteCreateParams): Promise<any> {
    let body = buildBodyParams(params as unknown as Record<string, unknown>);
    let response = await this.axios.post('/resources/pv_power_site', body);
    return response.data;
  }

  async updatePvPowerSite(params: PvPowerSiteUpdateParams): Promise<any> {
    let { resourceId, ...rest } = params;
    let body = buildBodyParams(rest as Record<string, unknown>);
    let response = await this.axios.patch('/resources/pv_power_site', body, {
      params: { resource_id: resourceId }
    });
    return response.data;
  }

  async replacePvPowerSite(
    params: PvPowerSiteCreateParams & { resourceId: string }
  ): Promise<any> {
    let { resourceId, ...rest } = params;
    let body = buildBodyParams(rest as Record<string, unknown>);
    let response = await this.axios.put('/resources/pv_power_site', body, {
      params: { resource_id: resourceId }
    });
    return response.data;
  }

  async deletePvPowerSite(resourceId: string): Promise<void> {
    await this.axios.delete('/resources/pv_power_site', {
      params: { resource_id: resourceId }
    });
  }
}
