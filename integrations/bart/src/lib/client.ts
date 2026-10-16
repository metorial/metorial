import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  extractApiErrorMessage,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { bartRecord, bartText } from './response';

type ApiArea = 'etd' | 'stn' | 'route' | 'sched' | 'bsa';

let requiredNodes = {
  etd: 'station',
  stns: 'stations',
  stninfo: 'stations',
  stnaccess: 'stations',
  routes: 'routes',
  routeinfo: 'routes',
  scheds: 'schedules',
  stnsched: 'station',
  routesched: 'route',
  fare: 'fares',
  depart: 'schedule',
  arrive: 'schedule',
  bsa: 'bsa',
  elev: 'bsa',
  count: 'traincount'
} as const;

type ApiCommand = keyof typeof requiredNodes;

export class BartClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('A BART API key is required.');
    }
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.bart.gov/api/',
      params: { key: config.token.trim(), json: 'y' },
      contentType: false,
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'BART',
          reason: 'bart_api_error'
        })
    });
  }

  private async request(
    area: ApiArea,
    cmd: ApiCommand,
    params: Record<string, string | number | undefined> = {}
  ) {
    let response = await this.http.get(`${area}.aspx`, {
      params: { cmd, ...pickDefined(params) }
    });
    let root = bartRecord(response.data).root;
    if (!isApiErrorRecord(root)) {
      throw createApiServiceError('BART returned an invalid response. Try again later.', {
        reason: 'bart_invalid_response'
      });
    }
    let error = root.error ?? bartRecord(root.message).error;
    if (error !== undefined && error !== null && error !== '') {
      let message =
        bartText(error) ||
        extractApiErrorMessage(error, {
          response: { data: error },
          detailKeys: ['text', 'message', 'description', '#cdata-section'],
          fallbackMessage: 'The provider rejected the request.'
        });
      throw createApiServiceError(`BART API ${cmd} failed: ${message}`, {
        reason: 'bart_api_error',
        upstreamCode: bartText(bartRecord(error)['@code']) || undefined
      });
    }
    if (root[requiredNodes[cmd]] === undefined) {
      throw createApiServiceError(
        `BART returned an incomplete ${cmd} response. Try again later.`,
        {
          reason: 'bart_invalid_response'
        }
      );
    }
    return root;
  }

  async getEstimatedDepartures(params: {
    station: string;
    platform?: number;
    direction?: string;
    groupByColor?: boolean;
  }) {
    if (
      params.platform !== undefined &&
      (!Number.isInteger(params.platform) || params.platform < 1 || params.platform > 4)
    ) {
      throw createApiServiceError('platform must be a whole number from 1 to 4.');
    }
    if (params.platform !== undefined && params.direction !== undefined) {
      throw createApiServiceError('Use either platform or direction to filter departures.');
    }
    if (
      params.station.trim().toUpperCase() === 'ALL' &&
      (params.platform !== undefined || params.direction !== undefined)
    ) {
      throw createApiServiceError('Platform and direction filters require a single station.');
    }
    return this.request('etd', 'etd', {
      orig: params.station,
      plat: params.platform,
      dir: params.direction,
      gbColor: params.groupByColor === undefined ? undefined : params.groupByColor ? 1 : 0
    });
  }

  async getStations() {
    return this.request('stn', 'stns');
  }

  async getStationInfo(station: string) {
    return this.request('stn', 'stninfo', { orig: station });
  }

  async getStationAccess(station: string) {
    return this.request('stn', 'stnaccess', { orig: station, l: '1' });
  }

  async getRoutes(date?: string) {
    if (date?.trim()) {
      throw createApiServiceError(
        'BART no longer supports date-filtered route discovery. Omit date to list current routes, or provide routeNumber to request route details for a date.'
      );
    }
    return this.request('route', 'routes');
  }

  async getRouteInfo(route: string, date?: string) {
    return this.request('route', 'routeinfo', { route, date });
  }

  async getSchedules() {
    return this.request('sched', 'scheds');
  }

  async getStationSchedule(station: string, date?: string) {
    return this.request('sched', 'stnsched', { orig: station, date });
  }

  async getRouteSchedule(params: { route: string; date?: string; time?: string }) {
    if (params.time?.trim()) {
      throw createApiServiceError(
        'BART no longer supports time-filtered route schedules. Omit time to retrieve the full daily schedule, or use plan_trip for a time-based itinerary.'
      );
    }
    return this.request('sched', 'routesched', { route: params.route, date: params.date });
  }

  async getFare(params: { origin: string; destination: string; date?: string }) {
    return this.request('sched', 'fare', {
      orig: params.origin,
      dest: params.destination,
      date: params.date
    });
  }

  async planTrip(params: {
    origin: string;
    destination: string;
    time?: string;
    date?: string;
    tripsBefore?: number;
    tripsAfter?: number;
    type: 'depart' | 'arrive';
  }) {
    let before = params.tripsBefore ?? 2;
    let after = params.tripsAfter ?? 2;
    if (!Number.isInteger(before) || before < 0 || before > 3) {
      throw createApiServiceError('tripsBefore must be a whole number from 0 to 3.');
    }
    if (!Number.isInteger(after) || after < 1 || after > 3) {
      throw createApiServiceError('tripsAfter must be a whole number from 1 to 3.');
    }
    return this.request('sched', params.type, {
      orig: params.origin,
      dest: params.destination,
      time: params.time,
      date: params.date,
      b: params.tripsBefore,
      a: params.tripsAfter
    });
  }

  async getAdvisories() {
    return this.request('bsa', 'bsa');
  }

  async getElevatorStatus() {
    return this.request('bsa', 'elev');
  }

  async getTrainCount() {
    return this.request('bsa', 'count');
  }
}
