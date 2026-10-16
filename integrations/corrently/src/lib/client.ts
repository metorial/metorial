import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  extractApiErrorMessage,
  isApiErrorRecord,
  pickDefined
} from 'slates';

let correntlyErrorDetails = { nestedKeys: ['error', 'errors', 'details'] };

let getCorrentlyErrorCode = (body: unknown) => {
  if (!isApiErrorRecord(body)) return undefined;
  let code = isApiErrorRecord(body.error) ? body.error.code : body.code;
  return typeof code === 'string' || typeof code === 'number'
    ? String(code).trim() || undefined
    : undefined;
};

export let requireZip = (zip?: string) => {
  if (!zip || !/^\d{5}$/.test(zip)) {
    throw createApiServiceError(
      'Provide a German postal code containing exactly five digits.'
    );
  }
  return zip;
};

export let requireId = (value: string, field: string) => {
  if (!value.trim()) throw createApiServiceError(`${field} cannot be empty.`);
  return value.trim();
};

export let requireNumber = (
  value: number | undefined,
  field: string,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  whole = false
) => {
  if (
    value !== undefined &&
    (!Number.isFinite(value) ||
      value < min ||
      value > max ||
      (whole && !Number.isInteger(value)))
  ) {
    throw createApiServiceError(
      `${field} must be ${whole ? 'a whole number' : 'a number'} between ${min} and ${max === Number.POSITIVE_INFINITY ? 'the supported maximum' : max}.`
    );
  }
};

export type DataRecord = Record<string, unknown>;
export interface ScheduleRequirements {
  law: 'price' | 'solar' | 'emission' | 'comfort';
  activeHours?: number;
  consecutiveHours?: boolean;
  energyDemand?: number;
  maxLoad?: number;
  avgLoad?: number;
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token?: string }) {
    let token = config.token?.trim();
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.corrently.io/v2.0',
      authHeader: token ? { value: `Bearer ${token}` } : undefined,
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Corrently',
          ...correntlyErrorDetails,
          extractUpstreamCode: (_error, response) => getCorrentlyErrorCode(response?.data),
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
          reason: 'corrently_api_error'
        })
    });
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT',
    path: string,
    params?: DataRecord,
    data?: unknown
  ): Promise<T> {
    let response = await this.axios.request<T>({
      method,
      url: path,
      params: params ? pickDefined(params) : undefined,
      data
    });
    let body = response.data;
    if (body && typeof body === 'object' && 'error' in body && body.error) {
      throw createApiServiceError(
        `Corrently API request failed: ${extractApiErrorMessage({ response: { data: body } }, correntlyErrorDetails)}`,
        { reason: 'corrently_api_error', upstreamCode: getCorrentlyErrorCode(body) }
      );
    }
    return body;
  }

  getGsiPrediction(params: { zip: string }) {
    return this.request<GsiPredictionResponse>('GET', '/gsi/prediction', {
      zip: requireZip(params.zip)
    });
  }

  getBestHour(params: { zip: string; timeframe?: number; hours?: number }) {
    requireNumber(params.timeframe, 'Look-ahead hours', 1, 168, true);
    requireNumber(params.hours, 'Required hours', 1, params.timeframe ?? 24, true);
    return this.request<BestHourResponse>('GET', '/gsi/bestHour', {
      ...params,
      zip: requireZip(params.zip)
    });
  }

  getMarketData(params: { zip: string }) {
    return this.request<MarketDataResponse>('GET', '/gsi/marketdata', {
      zip: requireZip(params.zip)
    });
  }

  getDispatch(params: { zip: string }) {
    return this.request<DispatchResponse>('GET', '/gsi/dispatch', {
      zip: requireZip(params.zip)
    });
  }

  createSchedule(params: {
    zip: string;
    law: ScheduleRequirements['law'];
    activeHours: number;
    date?: string;
    coverageHours?: number;
    consecutiveHours?: boolean;
    energyDemand?: number;
    maxLoad?: number;
    avgLoad?: number;
  }) {
    let { zip, date, coverageHours, ...requirements } = params;
    this.validateRequirements(requirements);
    requireNumber(coverageHours, 'Coverage hours', 1, 36, true);
    if (coverageHours !== undefined && params.activeHours > coverageHours)
      throw createApiServiceError('Active hours cannot exceed coverage hours.');
    if (
      date &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date)
    )
      throw createApiServiceError('Schedule date must be a valid YYYY-MM-DD date.');
    return this.request<ScheduleResponse>(
      'PUT',
      '/gsi/schedule',
      undefined,
      pickDefined({
        zip: requireZip(zip),
        date,
        coverageHours,
        requirements: pickDefined(requirements)
      })
    );
  }

  getSchedule(scheduleId: string) {
    return this.request<ScheduleResponse>('GET', '/gsi/schedule', {
      scheduleId: requireId(scheduleId, 'Schedule ID')
    });
  }

  private validateRequirements(requirements: ScheduleRequirements) {
    requireNumber(requirements.activeHours, 'Active hours', 1, 36, true);
    requireNumber(requirements.energyDemand, 'Energy demand');
    requireNumber(requirements.maxLoad, 'Maximum load');
    requireNumber(requirements.avgLoad, 'Average load');
    if (
      requirements.avgLoad !== undefined &&
      requirements.maxLoad !== undefined &&
      requirements.avgLoad > requirements.maxLoad
    )
      throw createApiServiceError('Average load cannot exceed maximum load.');
  }

  updateScheduleRequirements(scheduleId: string, requirements: ScheduleRequirements) {
    this.validateRequirements(requirements);
    return this.request<ScheduleResponse>('POST', '/gsi/schedule', undefined, {
      scheduleId: requireId(scheduleId, 'Schedule ID'),
      type: 'requirement_update',
      requirements: pickDefined(requirements)
    });
  }

  updateScheduleConsumption(
    scheduleId: string,
    consumption: {
      currentEnergy?: number;
      currentPower?: number;
      timeSlots?: {
        startTime: string;
        endTime: string;
        energy: number;
        averagePower: number;
      }[];
    }
  ) {
    if (
      consumption.currentEnergy === undefined &&
      consumption.currentPower === undefined &&
      !consumption.timeSlots?.length
    )
      throw createApiServiceError(
        'Provide current energy, current power, or at least one consumption time slot.'
      );
    requireNumber(consumption.currentEnergy, 'Current energy');
    requireNumber(consumption.currentPower, 'Current power');
    for (let slot of consumption.timeSlots ?? []) {
      requireNumber(slot.energy, 'Time-slot energy');
      requireNumber(slot.averagePower, 'Time-slot average power');
      let start = Date.parse(slot.startTime);
      let end = Date.parse(slot.endTime);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
        throw createApiServiceError(
          'Consumption time slots require valid timestamps with endTime after startTime.'
        );
    }
    return this.request<ScheduleResponse>('POST', '/gsi/schedule', undefined, {
      scheduleId: requireId(scheduleId, 'Schedule ID'),
      type: 'status_update',
      consumption: pickDefined(consumption)
    });
  }

  getStrommix(params: { period?: string; from?: string; to?: string }) {
    let periods: Record<string, string> = {
      last_month: 'lastmonth',
      last_7_days: 'last7days'
    };
    if (params.period && (params.from || params.to))
      throw createApiServiceError(
        'Use either a predefined period or a custom from/to date range.'
      );
    if (Boolean(params.from) !== Boolean(params.to))
      throw createApiServiceError('Provide both from and to for a custom date range.');
    if (params.from && params.to) {
      let parse = (value: string) => (/^\d+$/.test(value) ? Number(value) : Date.parse(value));
      if (
        !Number.isFinite(parse(params.from)) ||
        !Number.isFinite(parse(params.to)) ||
        parse(params.from) >= parse(params.to)
      )
        throw createApiServiceError(
          'The custom date range must have a valid from value before to.'
        );
    }
    return this.request<StrommixResponse>('GET', '/gsi/strommix', {
      ...params,
      period: params.period ? (periods[params.period] ?? params.period) : undefined
    });
  }

  getMeritOrder() {
    return this.request<MeritOrderResponse>('GET', '/mol/analysis');
  }

  getSolarPrediction(params: {
    zip?: string;
    lat?: number;
    lng?: number;
    kwp?: number;
    tilt?: number;
    azimuth?: number;
    technology?: string;
    lossPercent?: number;
    plant?: string;
  }) {
    if ((params.lat === undefined) !== (params.lng === undefined))
      throw createApiServiceError('Provide both latitude and longitude.');
    if (!params.zip && params.lat === undefined && !params.plant)
      throw createApiServiceError(
        'Provide a postal code, a latitude/longitude pair, or a solar plant ID.'
      );
    requireNumber(params.lat, 'Latitude', -90, 90);
    requireNumber(params.lng, 'Longitude', -180, 180);
    requireNumber(params.kwp, 'Installed capacity in kWp', 0.000001);
    requireNumber(params.tilt, 'Tilt', 0, 90);
    requireNumber(params.azimuth, 'Azimuth', 0, 360);
    requireNumber(params.lossPercent, 'System loss percentage', 0, 100);
    return this.request<SolarPredictionResponse>('GET', '/solar/prediction', {
      zip: params.zip ? requireZip(params.zip) : undefined,
      lat: params.lat,
      lon: params.lng,
      wp: params.kwp === undefined ? undefined : params.kwp * 1000,
      deg: params.tilt,
      az: params.azimuth === undefined ? undefined : ((params.azimuth + 360) % 360) - 180,
      tech: params.technology,
      loss: params.lossPercent,
      plant: params.plant
    });
  }

  getMeterReading(params: { account: string }) {
    return this.request<MeterReadingResponse>('GET', '/metering/reading', {
      account: requireId(params.account, 'Account')
    });
  }

  postMeterReading(params: {
    zip: string;
    account?: string;
    energy: number;
    secret?: string;
  }) {
    requireNumber(params.energy, 'Meter reading', 0);
    return this.request<MeterReadingResponse>(
      'POST',
      '/metering/reading',
      undefined,
      pickDefined({ ...params, zip: requireZip(params.zip) })
    );
  }

  getStromkontoBalances(params: { account: string }) {
    return this.request<StromkontoBalancesResponse>('GET', '/stromkonto/balances', {
      account: requireId(params.account, 'Account')
    });
  }

  getTariffComponents(params: { zipcode: string; kwha?: number }) {
    requireNumber(params.kwha, 'Annual consumption', 0.000001);
    return this.request<TariffComponentsResponse>('GET', '/tariff/components', {
      ...params,
      zipcode: requireZip(params.zipcode)
    });
  }

  getCo2Offset(params: { co2Kg: number; activityType?: string }) {
    return this.request<Co2OffsetResponse>('GET', '/tree/calculateCO2', {
      co2_kg: params.co2Kg,
      activity_type: params.activityType
    });
  }

  getCo2Advice(zip: string) {
    return this.request<DataRecord>('GET', '/gsi/advisor', { q: requireZip(zip) });
  }

  compareChargeOrFuel(params: {
    zip: string;
    electricConsumption: number;
    fuelConsumption: number;
  }) {
    requireNumber(params.electricConsumption, 'Electric consumption', 0.000001);
    requireNumber(params.fuelConsumption, 'Fuel consumption', 0.000001);
    return this.request<DataRecord>('GET', '/phev/chargeorfuel', {
      ...params,
      zip: requireZip(params.zip)
    });
  }

  getCo2Meter(meterId: string) {
    return this.request<Co2MeterResponse>('GET', '/co2meter', {
      meterId: requireId(meterId, 'CO2 meter ID')
    });
  }

  updateCo2Meter(params: { meterId?: string; zip?: string; reading: number }) {
    if (!params.meterId && !params.zip)
      throw createApiServiceError('Provide meterId to update a meter, or zip to create one.');
    requireNumber(params.reading, 'Meter reading in Wh', 0, Number.POSITIVE_INFINITY, true);
    return this.request<Co2MeterResponse>(
      'POST',
      '/co2meter',
      undefined,
      pickDefined({
        ...params,
        meterId: params.meterId ? requireId(params.meterId, 'CO2 meter ID') : undefined,
        zip: params.zip ? requireZip(params.zip) : undefined
      })
    );
  }
}

export interface GsiPredictionResponse extends DataRecord {
  forecast: GsiForecastItem[];
  location?: { city?: string; zip?: string; signature?: string };
  signature?: string;
}
export interface GsiForecastItem extends DataRecord {
  epochtime: number;
  timeStamp: number;
  gsi: number;
  sci?: number;
  co2_g_oekostrom?: number;
  co2_g_standard?: number;
  energyprice?: number | string;
}
export interface BestHourResponse extends DataRecord {
  activated?: boolean;
  bestHour?: number;
}
export interface MarketDataResponse extends DataRecord {
  data: {
    start_timestamp: number;
    end_timestamp: number;
    marketprice: number;
    localprice?: number;
    localcell?: string;
    unit?: string;
  }[];
}
export interface DispatchLocation extends DataRecord {
  energy?: number;
  city?: string;
  zip?: string;
  lat?: number;
  lng?: number;
  location?: { label?: string; prettyLabel?: string; zip?: string; coordinates?: number[] };
}
export interface DispatchResponse extends DataRecord {
  avg_distance_km?: number;
  dispatch_from?: DispatchLocation[];
  dispatch_to?: DispatchLocation[];
  postmix?: Record<string, number>;
  premix?: Record<string, number>;
  timeframe?: { start: number; end: number };
  center?: { city?: string; zip?: string; lat?: number; lng?: number; coordinates?: number[] };
}
export interface ScheduleSlot extends DataRecord {
  epochtime?: number;
  timeStamp?: number;
  active?: boolean;
  gsi?: number;
  price?: number;
  co2?: number;
  startTime?: string;
  endTime?: string;
  state?: string;
  expectedLoad?: number;
  expectedEnergy?: number;
  metrics?: { gsi?: number; price?: number; co2_g_standard?: number };
}
export interface ScheduleResponse extends DataRecord {
  scheduleId?: string;
  status?: string;
  schedule?: ScheduleSlot[] | { timeSlots?: ScheduleSlot[]; currentRecommendation?: unknown };
}
export interface StrommixResponse extends DataRecord {
  mix?: DataRecord | { type: string; name: string; value: number; percentage: number }[];
  total?: number;
}
export type MeritOrderResponse = DataRecord[] | (DataRecord & { data?: DataRecord[] });
export interface SolarPredictionResponse extends DataRecord {
  forecast?: SolarForecastItem[];
  output?: SolarForecastItem[];
}
export interface SolarForecastItem extends DataRecord {
  epochtime?: number;
  timeStamp?: number;
  timestamp?: number;
  wh?: number;
  watt?: number;
  date?: string;
}
export interface MeterReadingResponse extends DataRecord {
  '1.8.0'?: number;
  '1.8.1'?: number;
  '1.8.2'?: number;
  account?: string;
  co2_g_oekostrom?: number;
  co2_g_standard?: number;
  timeStamp?: number;
}
export interface StromkontoBalance extends DataRecord {
  balance?: number;
  haben?: number;
  soll?: number;
  variation?: string;
  txs?: {
    txid?: string;
    txtype?: string;
    value?: number;
    timeStamp?: number;
    cashier?: string;
  }[];
}
export type StromkontoBalancesResponse =
  | StromkontoBalance[]
  | (DataRecord & { balances?: StromkontoBalance[] });
export interface TariffComponentsResponse extends DataRecord {
  components?: {
    describtion?: string;
    description?: string;
    per?: number;
    sum?: number;
    mutlityplier?: string;
    multiplier?: string;
  }[];
}
export interface Co2OffsetResponse extends DataRecord {
  co2Kg?: number;
  trees?: number;
}
export interface Co2MeterResponse extends DataRecord {
  meterId?: string;
  co2?: number;
  reading?: number;
  created?: number;
  updated?: number;
  expires?: number;
}
