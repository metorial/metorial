import { createAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(private config: { token?: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.corrently.io/v2.0'
    });
  }

  private get authParams(): Record<string, string> {
    if (this.config.token) {
      return { token: this.config.token };
    }
    return {};
  }

  async getGsiPrediction(params: { zip: string }): Promise<GsiPredictionResponse> {
    let response = await this.axios.get('/gsi/prediction', {
      params: { zip: params.zip, ...this.authParams }
    });
    return response.data as GsiPredictionResponse;
  }

  async getBestHour(params: {
    zip: string;
    timeframe?: number;
    hours?: number;
  }): Promise<BestHourResponse> {
    let response = await this.axios.get('/gsi/bestHour', {
      params: {
        zip: params.zip,
        timeframe: params.timeframe,
        hours: params.hours,
        ...this.authParams
      }
    });
    return response.data as BestHourResponse;
  }

  async getMarketData(params: { zip: string }): Promise<MarketDataResponse> {
    let response = await this.axios.get('/gsi/marketdata', {
      params: { zip: params.zip, ...this.authParams }
    });
    return response.data as MarketDataResponse;
  }

  async getDispatch(params: { zip: string }): Promise<DispatchResponse> {
    let response = await this.axios.get('/gsi/dispatch', {
      params: { zip: params.zip, ...this.authParams }
    });
    return response.data as DispatchResponse;
  }

  async createSchedule(params: {
    zip: string;
    law: string;
    activeHours: number;
  }): Promise<ScheduleResponse> {
    let response = await this.axios.put(
      '/gsi/schedule',
      {
        zip: params.zip,
        requirements: {
          law: params.law,
          activeHours: params.activeHours
        }
      },
      {
        params: this.authParams
      }
    );
    return response.data as ScheduleResponse;
  }

  async getStrommix(params: {
    period?: string;
    from?: string;
    to?: string;
  }): Promise<StrommixResponse> {
    let response = await this.axios.get('/gsi/strommix', {
      params: { period: params.period, from: params.from, to: params.to, ...this.authParams }
    });
    return response.data as StrommixResponse;
  }

  async getMeritOrder(): Promise<MeritOrderResponse> {
    let response = await this.axios.get('/gsi/meritorder', {
      params: this.authParams
    });
    return response.data as MeritOrderResponse;
  }

  async getSolarPrediction(params: {
    zip?: string;
    lat?: number;
    lng?: number;
    kwp?: number;
    tilt?: number;
    azimuth?: number;
    technology?: string;
  }): Promise<SolarPredictionResponse> {
    let response = await this.axios.get('/solar/prediction', {
      params: { ...params, ...this.authParams }
    });
    return response.data as SolarPredictionResponse;
  }

  async getMeterReading(params: { account: string }): Promise<MeterReadingResponse> {
    let response = await this.axios.get('/metering/reading', {
      params: { account: params.account, ...this.authParams }
    });
    return response.data as MeterReadingResponse;
  }

  async postMeterReading(params: {
    zip: string;
    account?: string;
    energy: number;
    secret?: string;
  }): Promise<MeterReadingResponse> {
    let response = await this.axios.post(
      '/metering/reading',
      {
        zip: params.zip,
        account: params.account,
        energy: params.energy,
        secret: params.secret
      },
      {
        params: this.authParams
      }
    );
    return response.data as MeterReadingResponse;
  }

  async getStromkontoBalances(params: {
    account: string;
  }): Promise<StromkontoBalancesResponse> {
    let response = await this.axios.get('/stromkonto/balances', {
      params: { account: params.account, ...this.authParams }
    });
    return response.data as StromkontoBalancesResponse;
  }

  async getTariffComponents(params: {
    zipcode: string;
    kwha?: number;
  }): Promise<TariffComponentsResponse> {
    let response = await this.axios.get('/tariff/components', {
      params: { zipcode: params.zipcode, kwha: params.kwha, ...this.authParams }
    });
    return response.data as TariffComponentsResponse;
  }

  async getCo2Offset(params: {
    co2Kg: number;
    activityType?: string;
  }): Promise<Co2OffsetResponse> {
    let response = await this.axios.get('/tree/calculateCO2', {
      params: { co2_kg: params.co2Kg, activity_type: params.activityType, ...this.authParams }
    });
    return response.data as Co2OffsetResponse;
  }
}

// --- Response Types ---

export interface GsiPredictionResponse {
  forecast: GsiForecastItem[];
  location?: {
    city?: string;
    zip?: string;
  };
  matrix?: Record<string, any>;
  signature?: string;
  signee?: string;
  [key: string]: any;
}

export interface GsiForecastItem {
  epochtime: number;
  eevalue?: number;
  ewind?: number;
  esolar?: number;
  ensolar?: number;
  enwind?: number;
  gsi: number;
  sci?: number;
  co2_g_oekostrom?: number;
  co2_g_standard?: number;
  energyprice?: number;
  timeStamp: number;
  scaled?: boolean;
  [key: string]: any;
}

export interface BestHourResponse {
  activated?: boolean;
  bestHour?: number;
  [key: string]: any;
}

export interface MarketDataResponse {
  data: MarketDataItem[];
  [key: string]: any;
}

export interface MarketDataItem {
  start_timestamp: number;
  end_timestamp: number;
  marketprice: number;
  [key: string]: any;
}

export interface DispatchResponse {
  avg_distance_km?: number;
  dispatch_from?: DispatchLocation[];
  dispatch_to?: DispatchLocation[];
  postmix?: Record<string, number>;
  premix?: Record<string, number>;
  timeframe?: {
    start: number;
    end: number;
  };
  center?: {
    city?: string;
    zip?: string;
    lat?: number;
    lng?: number;
  };
  [key: string]: any;
}

export interface DispatchLocation {
  energy?: number;
  city?: string;
  zip?: string;
  lat?: number;
  lng?: number;
  [key: string]: any;
}

export interface ScheduleResponse {
  schedule?: ScheduleSlot[];
  [key: string]: any;
}

export interface ScheduleSlot {
  epochtime?: number;
  timeStamp?: number;
  active?: boolean;
  gsi?: number;
  price?: number;
  co2?: number;
  [key: string]: any;
}

export interface StrommixResponse {
  mix?: Record<string, any>;
  total?: number;
  [key: string]: any;
}

export interface MeritOrderResponse {
  data?: MeritOrderEntry[];
  [key: string]: any;
}

export interface MeritOrderEntry {
  [key: string]: any;
}

export interface SolarPredictionResponse {
  forecast?: SolarForecastItem[];
  [key: string]: any;
}

export interface SolarForecastItem {
  epochtime?: number;
  timeStamp?: number;
  wh?: number;
  watt?: number;
  [key: string]: any;
}

export interface MeterReadingResponse {
  '1.8.0'?: number;
  '1.8.1'?: number;
  '1.8.2'?: number;
  account?: string;
  co2_g_oekostrom?: number;
  co2_g_standard?: number;
  timeStamp?: number;
  [key: string]: any;
}

export interface StromkontoBalancesResponse {
  balances?: StromkontoBalance[];
  [key: string]: any;
}

export interface StromkontoBalance {
  balance?: number;
  haben?: number;
  soll?: number;
  variation?: string;
  txs?: StromkontoTransaction[];
  [key: string]: any;
}

export interface StromkontoTransaction {
  cashier?: string;
  timeStamp?: number;
  txid?: string;
  txtype?: string;
  value?: number;
  [key: string]: any;
}

export interface TariffComponentsResponse {
  components?: TariffComponent[];
  [key: string]: any;
}

export interface TariffComponent {
  describtion?: string;
  per?: number;
  sum?: number;
  mutlityplier?: string;
  components?: TariffComponent[];
  [key: string]: any;
}

export interface Co2OffsetResponse {
  co2Kg?: number;
  trees?: number;
  [key: string]: any;
}
