import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import type {
  AdvancedPvParams,
  AggregationParams,
  HistoricAdvancedPvParams,
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

let buildParams = (params: object): Record<string, string | number | boolean> => {
  let result: Record<string, string | number | boolean> = {};
  for (let [key, value] of Object.entries(pickDefined(params))) {
    if (value === null) continue;
    if (
      [
        'availabilityPercent',
        'constraintPowerMw',
        'dustSoilingLoss',
        'snowSoilingLoss'
      ].includes(key)
    )
      continue;
    if (
      ['hours', 'azimuthIntervals'].includes(key) &&
      (typeof value !== 'number' || !Number.isInteger(value) || value <= 0)
    ) {
      throw createApiServiceError(`${key} must be a positive whole number.`);
    }
    if (key === 'tilt' && typeof value === 'number' && value < 0)
      throw createApiServiceError('tilt must be between 0 and 90 degrees.');
    if (key === 'timeZone' && typeof value === 'string') value = normalizeTimeZone(value);
    if (key === 'probability' && typeof value === 'string') {
      let probability = value.toLowerCase();
      if (!['p50', 'p75', 'p90', 'p95'].includes(probability)) {
        throw createApiServiceError(
          'Solcast TMY supports P50, P75, P90, and P95. Choose a supported probability.'
        );
      }
      value = probability;
    }
    let snakeKey = toSnakeCase(key);
    if (
      [
        'applyAvailability',
        'applyConstraint',
        'applyDustSoiling',
        'applySnowSoiling'
      ].includes(key) &&
      typeof value === 'boolean'
    ) {
      if (value || key === 'applyConstraint') continue;
      value = key === 'applyAvailability' ? 100 : 0;
    }
    if (Array.isArray(value)) result[snakeKey] = value.join(',');
    else if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    )
      result[snakeKey] = value;
  }
  let overrides = params as {
    availabilityPercent?: number;
    constraintPowerMw?: number;
    dustSoilingLoss?: number;
    snowSoilingLoss?: number;
  };
  for (let [key, value] of Object.entries(
    pickDefined({
      apply_availability: overrides.availabilityPercent,
      apply_constraint: overrides.constraintPowerMw,
      apply_dust_soiling: overrides.dustSoilingLoss,
      apply_snow_soiling: overrides.snowSoilingLoss
    })
  ))
    if (typeof value === 'number') result[key] = value;
  return result;
};

let normalizeTimeZone = (value: string) => {
  if (['utc', 'longitudinal'].includes(value.toLowerCase())) return value.toLowerCase();
  let match = /^([+-])(\d{2}):(\d{2})$/.exec(value);
  let offset = match
    ? (Number(match[2]) + Number(match[3]) / 60) * (match[1] === '-' ? -1 : 1)
    : Number(value);
  if (
    !value.trim() ||
    !Number.isFinite(offset) ||
    Math.abs(offset) > 13 ||
    !Number.isInteger(offset * 4) ||
    (match && Number(match[3]) >= 60)
  ) {
    throw createApiServiceError(
      'timeZone must be UTC, longitudinal, or a UTC offset from -13 to 13 in quarter-hour increments.'
    );
  }
  return String(offset);
};

let validateHistoricRange = (input: { start?: string; end?: string; duration?: string }) => {
  if (!input.start?.trim())
    throw createApiServiceError('The "start" parameter is required for historic mode.');
  if (!input.end && !input.duration)
    throw createApiServiceError(
      'Provide end or duration for historic mode, covering no more than 31 days.'
    );
  if (input.end && input.duration)
    throw createApiServiceError('Provide either end or duration, not both.');
  let start = Date.parse(input.start);
  if (!Number.isFinite(start))
    throw createApiServiceError('start must be an ISO 8601 date or datetime.');
  let milliseconds: number;
  if (input.end) milliseconds = Date.parse(input.end) - start;
  else {
    let match =
      /^P(?:(\d+(?:\.\d+)?)W)?(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(
        input.duration ?? ''
      );
    if (!match?.slice(1).some(Boolean))
      throw createApiServiceError(
        'duration must be an ISO 8601 duration using weeks, days, hours, minutes, or seconds.'
      );
    milliseconds =
      (Number(match[1] ?? 0) * 7 * 86400 +
        Number(match[2] ?? 0) * 86400 +
        Number(match[3] ?? 0) * 3600 +
        Number(match[4] ?? 0) * 60 +
        Number(match[5] ?? 0)) *
      1000;
  }
  if (!Number.isFinite(milliseconds) || milliseconds <= 0 || milliseconds > 31 * 86400000)
    throw createApiServiceError(
      'Historic end or duration must be after start and within 31 days.'
    );
};

let buildBodyParams = (params: object): Record<string, unknown> => {
  let result: Record<string, unknown> = {};
  for (let [key, value] of Object.entries(pickDefined(params))) {
    if (value === null) continue;
    let snakeKey =
      key === 'bifacialSystemEnabled'
        ? 'bifacial_system'
        : key === 'deratingInverterEfficiency'
          ? 'inverter_peak_efficiency'
          : toSnakeCase(key);
    // Existing public site inputs are in kW; Solcast resource metadata uses MW.
    result[snakeKey] =
      ['capacity', 'capacityDc', 'gridExportLimit'].includes(key) &&
      typeof value === 'number' &&
      value !== -1
        ? value / 1000
        : value;
  }
  return result;
};

export let getDataPoints = (result: any, preferredKey: string) => {
  let data =
    result?.[preferredKey] ?? result?.estimated_actuals ?? result?.forecasts ?? result?.tmy;
  if (data === undefined || data === null) return [];
  if (!Array.isArray(data))
    throw createApiServiceError('Solcast returned an invalid time-series response.');
  return data;
};

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim())
      throw createApiServiceError(
        'A Solcast API key is required. Reconnect with a valid API key.'
      );
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.solcast.com.au',
      authHeader: { value: `Bearer ${config.token.trim()}` },
      headers: { Accept: 'application/json' },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Solcast',
          reason: 'solcast_api_error',
          extractResponse: (failure, helpers) => helpers.getResponseWithBody(failure),
          nestedKeys: ['response_status', 'errors'],
          detailKeys: ['message', 'error_code', 'field_name'],
          extractUpstreamCode: (failure, response, helpers) => {
            let data = response?.data ?? helpers.getResponseWithBody(failure)?.data;
            if (!helpers.isRecord(data) || !helpers.isRecord(data.response_status))
              return undefined;
            return typeof data.response_status.error_code === 'string'
              ? data.response_status.error_code
              : undefined;
          }
        })
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
    validateHistoricRange(params);
    let response = await this.axios.get('/data/historic/radiation_and_weather', {
      params: buildParams({ ...params, hours: undefined, format: 'json' })
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
    validateHistoricRange(params);
    let response = await this.axios.get('/data/historic/rooftop_pv_power', {
      params: buildParams({ ...params, hours: undefined, format: 'json' })
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
    validateHistoricRange(params);
    let response = await this.axios.get('/data/historic/advanced_pv_power', {
      params: buildParams({ ...params, hours: undefined, format: 'json' })
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
    if (!params.collectionId?.trim())
      throw createApiServiceError(
        'collectionId is required. Use the collection identifier supplied by Solcast.'
      );
    let response = await this.axios.get('/data/live/aggregations', {
      params: buildParams({ ...params, format: 'json' })
    });
    return response.data;
  }

  async getForecastAggregations(params: AggregationParams): Promise<any> {
    if (!params.collectionId?.trim())
      throw createApiServiceError(
        'collectionId is required. Use the collection identifier supplied by Solcast.'
      );
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
    if (params?.skip !== undefined && (!Number.isInteger(params.skip) || params.skip < 0)) {
      throw createApiServiceError('skip must be a nonnegative whole number.');
    }
    if (params?.take !== undefined && (!Number.isInteger(params.take) || params.take <= 0)) {
      throw createApiServiceError('take must be a positive whole number.');
    }
    let response = await this.axios.get('/resources/pv_power_sites', {
      params: buildParams({ ...params, format: 'json' })
    });
    return response.data;
  }

  async getPvPowerSite(resourceId: string): Promise<any> {
    let response = await this.axios.get('/resources/pv_power_site', {
      params: { resource_id: resourceId, format: 'json' }
    });
    return response.data;
  }

  async createPvPowerSite(params: PvPowerSiteCreateParams): Promise<any> {
    let body = buildBodyParams(params);
    let response = await this.axios.post('/resources/pv_power_site', body, {
      params: { format: 'json' }
    });
    return response.data;
  }

  async updatePvPowerSite(params: PvPowerSiteUpdateParams): Promise<any> {
    let { resourceId, ...rest } = params;
    let body = buildBodyParams({ resourceId, ...rest });
    let response = await this.axios.patch('/resources/pv_power_site', body, {
      params: { format: 'json' }
    });
    return response.data;
  }

  async replacePvPowerSite(
    params: PvPowerSiteCreateParams & { resourceId: string }
  ): Promise<any> {
    let { resourceId, ...rest } = params;
    let body = buildBodyParams({ resourceId, ...rest });
    let response = await this.axios.put('/resources/pv_power_site', body, {
      params: { format: 'json' }
    });
    return response.data;
  }

  async deletePvPowerSite(resourceId: string): Promise<void> {
    await this.axios.delete('/resources/pv_power_site', {
      params: { resource_id: resourceId, format: 'json' }
    });
  }
  async submitSiteMeasurements(resourceId: string, measurements: object[]): Promise<any> {
    let response = await this.axios.post(
      `/utility_scale_sites/${encodeURIComponent(resourceId)}/measurements`,
      {
        ResourceId: resourceId,
        measurements: measurements.map(measurement =>
          Object.fromEntries(
            Object.entries(pickDefined(measurement)).map(([key, value]) => [
              toSnakeCase(key),
              value
            ])
          )
        )
      },
      { params: { format: 'json' } }
    );
    return response.data;
  }
}
