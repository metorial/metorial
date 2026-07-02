import { createAxios } from 'slates';

let etdApi = createAxios({
  baseURL: 'https://api.bart.gov/api/etd.aspx'
});

let stnApi = createAxios({
  baseURL: 'https://api.bart.gov/api/stn.aspx'
});

let routeApi = createAxios({
  baseURL: 'https://api.bart.gov/api/route.aspx'
});

let schedApi = createAxios({
  baseURL: 'https://api.bart.gov/api/sched.aspx'
});

let bsaApi = createAxios({
  baseURL: 'https://api.bart.gov/api/bsa.aspx'
});

export class BartClient {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private baseParams() {
    return {
      key: this.token,
      json: 'y'
    };
  }

  // --- Real-Time Estimates ---

  async getEstimatedDepartures(params: {
    station: string;
    platform?: number;
    direction?: string;
  }) {
    let queryParams: Record<string, string> = {
      ...this.baseParams(),
      cmd: 'etd',
      orig: params.station
    };
    if (params.platform) queryParams.plat = String(params.platform);
    if (params.direction) queryParams.dir = params.direction;

    let response = await etdApi.get('', { params: queryParams });
    return response.data?.root;
  }

  // --- Station Information ---

  async getStations() {
    let response = await stnApi.get('', {
      params: { ...this.baseParams(), cmd: 'stns' }
    });
    return response.data?.root;
  }

  async getStationInfo(station: string) {
    let response = await stnApi.get('', {
      params: { ...this.baseParams(), cmd: 'stninfo', orig: station }
    });
    return response.data?.root;
  }

  async getStationAccess(station: string) {
    let response = await stnApi.get('', {
      params: { ...this.baseParams(), cmd: 'stnaccess', orig: station, l: '1' }
    });
    return response.data?.root;
  }

  // --- Route Information ---

  async getRoutes(date?: string) {
    let queryParams: Record<string, string> = {
      ...this.baseParams(),
      cmd: 'routes'
    };
    if (date) queryParams.date = date;

    let response = await routeApi.get('', { params: queryParams });
    return response.data?.root;
  }

  async getRouteInfo(route: string, date?: string) {
    let queryParams: Record<string, string> = {
      ...this.baseParams(),
      cmd: 'routeinfo',
      route
    };
    if (date) queryParams.date = date;

    let response = await routeApi.get('', { params: queryParams });
    return response.data?.root;
  }

  // --- Schedule Information ---

  async getSchedules() {
    let response = await schedApi.get('', {
      params: { ...this.baseParams(), cmd: 'scheds' }
    });
    return response.data?.root;
  }

  async getStationSchedule(station: string, date?: string) {
    let queryParams: Record<string, string> = {
      ...this.baseParams(),
      cmd: 'stnsched',
      orig: station
    };
    if (date) queryParams.date = date;

    let response = await schedApi.get('', { params: queryParams });
    return response.data?.root;
  }

  async getRouteSchedule(params: { route: string; date?: string; time?: string }) {
    let queryParams: Record<string, string> = {
      ...this.baseParams(),
      cmd: 'routesched',
      route: params.route
    };
    if (params.date) queryParams.date = params.date;
    if (params.time) queryParams.time = params.time;

    let response = await schedApi.get('', { params: queryParams });
    return response.data?.root;
  }

  // --- Fare Information ---

  async getFare(params: { origin: string; destination: string; date?: string }) {
    let queryParams: Record<string, string> = {
      ...this.baseParams(),
      cmd: 'fare',
      orig: params.origin,
      dest: params.destination
    };
    if (params.date) queryParams.date = params.date;

    let response = await schedApi.get('', { params: queryParams });
    return response.data?.root;
  }

  // --- Trip Planning ---

  async planTrip(params: {
    origin: string;
    destination: string;
    time?: string;
    date?: string;
    tripsBefore?: number;
    tripsAfter?: number;
    type: 'depart' | 'arrive';
  }) {
    let queryParams: Record<string, string> = {
      ...this.baseParams(),
      cmd: params.type,
      orig: params.origin,
      dest: params.destination
    };
    if (params.time) queryParams.time = params.time;
    if (params.date) queryParams.date = params.date;
    if (params.tripsBefore !== undefined) queryParams.b = String(params.tripsBefore);
    if (params.tripsAfter !== undefined) queryParams.a = String(params.tripsAfter);

    let response = await schedApi.get('', { params: queryParams });
    return response.data?.root;
  }

  // --- Service Advisories ---

  async getAdvisories(station?: string) {
    let queryParams: Record<string, string> = {
      ...this.baseParams(),
      cmd: 'bsa'
    };
    if (station) queryParams.orig = station;

    let response = await bsaApi.get('', { params: queryParams });
    return response.data?.root;
  }

  // --- Elevator Status ---

  async getElevatorStatus() {
    let response = await bsaApi.get('', {
      params: { ...this.baseParams(), cmd: 'elev' }
    });
    return response.data?.root;
  }

  // --- Train Count ---

  async getTrainCount() {
    let response = await bsaApi.get('', {
      params: { ...this.baseParams(), cmd: 'count' }
    });
    return response.data?.root;
  }
}
