import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export class TomTomClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private apiKey: string;
  private adminKey?: string;

  constructor(config: { token: string; adminKey?: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('Provide a TomTom API key.');
    }
    this.apiKey = config.token;
    this.adminKey = config.adminKey;
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.tomtom.com',
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'TomTom',
          reason: 'TomTom API request failed',
          nestedKeys: ['errors', 'detailedError', 'details', 'innerError']
        })
    });
  }

  // ─── Search & Geocoding ───────────────────────────────────────────

  async fuzzySearch(params: {
    query: string;
    lat?: number;
    lon?: number;
    radius?: number;
    limit?: number;
    offset?: number;
    countrySet?: string;
    language?: string;
    categorySet?: string;
    brandSet?: string;
    typeahead?: boolean;
    minFuzzyLevel?: number;
    maxFuzzyLevel?: number;
  }) {
    if ((params.lat === undefined) !== (params.lon === undefined)) {
      throw createApiServiceError('Provide both lat and lon for a search bias.');
    }
    if (!params.query.trim()) {
      throw createApiServiceError('Provide a non-empty search query.');
    }
    if (
      params.limit !== undefined &&
      (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 100)
    ) {
      throw createApiServiceError('Search limit must be a whole number from 1 to 100.');
    }
    if (
      params.offset !== undefined &&
      (!Number.isInteger(params.offset) || params.offset < 0)
    ) {
      throw createApiServiceError('Search offset must be a non-negative whole number.');
    }
    let query = encodeURIComponent(params.query);
    let response = await this.axios.get(`/search/2/search/${query}.json`, {
      params: {
        key: this.apiKey,
        limit: params.limit,
        ofs: params.offset,
        lat: params.lat,
        lon: params.lon,
        radius: params.radius,
        countrySet: params.countrySet,
        language: params.language,
        categorySet: params.categorySet,
        brandSet: params.brandSet,
        typeahead: params.typeahead,
        minFuzzyLevel: params.minFuzzyLevel,
        maxFuzzyLevel: params.maxFuzzyLevel
      }
    });
    return response.data;
  }

  async reverseGeocode(params: {
    lat: number;
    lon: number;
    radius?: number;
    language?: string;
    entityType?: string;
  }) {
    let position = `${params.lat},${params.lon}`;
    let response = await this.axios.get(`/search/2/reverseGeocode/${position}.json`, {
      params: {
        key: this.apiKey,
        radius: params.radius,
        language: params.language,
        entityType: params.entityType
      }
    });
    return response.data;
  }

  async autocomplete(params: {
    query: string;
    language: string;
    lat?: number;
    lon?: number;
    radius?: number;
    limit?: number;
    countrySet?: string;
    resultSet?: string;
  }) {
    if ((params.lat === undefined) !== (params.lon === undefined)) {
      throw createApiServiceError('Provide both lat and lon for an autocomplete bias.');
    }
    if (params.radius !== undefined && params.lat === undefined) {
      throw createApiServiceError('Provide lat and lon when using an autocomplete radius.');
    }
    let query = encodeURIComponent(params.query);
    let response = await this.axios.get(`/search/2/autocomplete/${query}.json`, {
      params: {
        key: this.apiKey,
        language: params.language,
        lat: params.lat,
        lon: params.lon,
        radius: params.radius,
        limit: params.limit,
        countrySet: params.countrySet,
        resultSet: params.resultSet
      }
    });
    return response.data;
  }

  async listPoiCategories(language?: string) {
    let response = await this.axios.get('/search/2/poiCategories.json', {
      params: { key: this.apiKey, language }
    });
    return response.data;
  }

  async structuredGeocode(params: {
    countryCode?: string;
    streetNumber?: string;
    streetName?: string;
    crossStreet?: string;
    municipality?: string;
    municipalitySubdivision?: string;
    postalCode?: string;
    limit?: number;
    language?: string;
  }) {
    let response = await this.axios.get('/search/2/structuredGeocode.json', {
      params: {
        key: this.apiKey,
        countryCode: params.countryCode,
        streetNumber: params.streetNumber,
        streetName: params.streetName,
        crossStreet: params.crossStreet,
        municipality: params.municipality,
        municipalitySubdivision: params.municipalitySubdivision,
        postalCode: params.postalCode,
        limit: params.limit,
        language: params.language
      }
    });
    return response.data;
  }

  // ─── Routing ──────────────────────────────────────────────────────

  async calculateRoute(params: {
    locations: Array<{ lat: number; lon: number }>;
    routeType?: string;
    traffic?: boolean;
    travelMode?: string;
    departAt?: string;
    arriveAt?: string;
    maxAlternatives?: number;
    avoid?: string[];
    vehicleMaxSpeed?: number;
    vehicleWeight?: number;
    vehicleLength?: number;
    vehicleWidth?: number;
    vehicleHeight?: number;
    vehicleEngineType?: string;
    computeBestOrder?: boolean;
    hilliness?: string;
    windingness?: string;
  }) {
    if (params.departAt !== undefined && params.arriveAt !== undefined) {
      throw createApiServiceError('Use departAt or arriveAt, not both.');
    }
    if (
      params.maxAlternatives !== undefined &&
      (!Number.isInteger(params.maxAlternatives) ||
        params.maxAlternatives < 0 ||
        params.maxAlternatives > 5)
    ) {
      throw createApiServiceError('maxAlternatives must be a whole number from 0 to 5.');
    }
    let locationStr = params.locations.map(l => `${l.lat},${l.lon}`).join(':');
    let response = await this.axios.get(`/routing/1/calculateRoute/${locationStr}/json`, {
      params: {
        key: this.apiKey,
        routeType: params.routeType,
        traffic: params.traffic,
        travelMode: params.travelMode,
        departAt: params.departAt,
        arriveAt: params.arriveAt,
        maxAlternatives: params.maxAlternatives,
        avoid: params.avoid?.join(','),
        vehicleMaxSpeed: params.vehicleMaxSpeed,
        vehicleWeight: params.vehicleWeight,
        vehicleLength: params.vehicleLength,
        vehicleWidth: params.vehicleWidth,
        vehicleHeight: params.vehicleHeight,
        vehicleEngineType: params.vehicleEngineType,
        computeBestOrder: params.computeBestOrder,
        hilliness: params.hilliness,
        windingness: params.windingness
      }
    });
    return response.data;
  }

  async calculateReachableRange(params: {
    originLat: number;
    originLon: number;
    fuelBudgetInLiters?: number;
    energyBudgetInkWh?: number;
    timeBudgetInSec?: number;
    distanceBudgetInMeters?: number;
    routeType?: string;
    traffic?: boolean;
    travelMode?: string;
    vehicleEngineType?: string;
    vehicleMaxSpeed?: number;
    constantSpeedConsumptionInLitersPerHundredkm?: string;
    constantSpeedConsumptionInkWhPerHundredkm?: string;
    avoid?: string[];
  }) {
    let budgets = [
      params.fuelBudgetInLiters,
      params.energyBudgetInkWh,
      params.timeBudgetInSec,
      params.distanceBudgetInMeters
    ].filter(value => value !== undefined);
    if (budgets.length !== 1 || !Number.isFinite(budgets[0]) || budgets[0]! < 0) {
      throw createApiServiceError('Provide exactly one non-negative reachable-range budget.');
    }
    if (
      params.fuelBudgetInLiters !== undefined &&
      (!params.constantSpeedConsumptionInLitersPerHundredkm ||
        params.vehicleEngineType === 'electric')
    ) {
      throw createApiServiceError(
        'A fuel budget requires a combustion engine and constantSpeedConsumptionInLitersPerHundredkm.'
      );
    }
    if (
      params.energyBudgetInkWh !== undefined &&
      (!params.constantSpeedConsumptionInkWhPerHundredkm ||
        params.vehicleEngineType === 'combustion')
    ) {
      throw createApiServiceError(
        'An energy budget requires an electric engine and constantSpeedConsumptionInkWhPerHundredkm.'
      );
    }
    let origin = `${params.originLat},${params.originLon}`;
    let response = await this.axios.get(`/routing/1/calculateReachableRange/${origin}/json`, {
      params: {
        key: this.apiKey,
        fuelBudgetInLiters: params.fuelBudgetInLiters,
        energyBudgetInkWh: params.energyBudgetInkWh,
        timeBudgetInSec: params.timeBudgetInSec,
        distanceBudgetInMeters: params.distanceBudgetInMeters,
        routeType: params.routeType,
        traffic: params.traffic,
        travelMode: params.travelMode,
        vehicleEngineType:
          params.vehicleEngineType ??
          (params.energyBudgetInkWh !== undefined ? 'electric' : undefined),
        vehicleMaxSpeed: params.vehicleMaxSpeed,
        constantSpeedConsumptionInLitersPerHundredkm:
          params.constantSpeedConsumptionInLitersPerHundredkm,
        constantSpeedConsumptionInkWhPerHundredkm:
          params.constantSpeedConsumptionInkWhPerHundredkm,
        avoid: params.avoid?.join(',')
      }
    });
    return response.data;
  }

  async matrixRouting(params: {
    origins: Array<{ lat: number; lon: number }>;
    destinations: Array<{ lat: number; lon: number }>;
    routeType?: string;
    traffic?: string;
    travelMode?: string;
    departAt?: string;
    avoid?: string[];
  }) {
    if (params.routeType && params.routeType !== 'fastest') {
      throw createApiServiceError('Synchronous matrix routing supports routeType fastest.');
    }
    if (params.travelMode && !['car', 'truck', 'pedestrian'].includes(params.travelMode)) {
      throw createApiServiceError(
        'Synchronous matrix routing supports car, truck, or pedestrian travelMode.'
      );
    }
    if (params.traffic === 'live' && params.departAt === 'any') {
      throw createApiServiceError('Live matrix traffic requires departAt now or a date/time.');
    }
    let response = await this.axios.post(
      '/routing/matrix/2',
      {
        origins: params.origins.map(o => ({ point: { latitude: o.lat, longitude: o.lon } })),
        destinations: params.destinations.map(d => ({
          point: { latitude: d.lat, longitude: d.lon }
        })),
        options: {
          routeType: params.routeType,
          traffic: params.traffic,
          travelMode: params.travelMode,
          departAt: params.departAt ?? (params.traffic === 'live' ? 'now' : undefined),
          avoid: params.avoid
        }
      },
      {
        params: { key: this.apiKey },
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async waypointOptimization(params: {
    waypoints: Array<{
      lat: number;
      lon: number;
      serviceTimeInSeconds?: number;
    }>;
    originIndex?: number;
    destinationIndex?: number;
    travelMode?: string;
    traffic?: string;
    departAt?: string;
  }) {
    if (params.waypoints.length > 12) {
      throw createApiServiceError('Waypoint optimization supports at most 12 waypoints.');
    }
    for (let index of [params.originIndex, params.destinationIndex]) {
      if (
        index !== undefined &&
        (!Number.isInteger(index) || index < -1 || index >= params.waypoints.length)
      ) {
        throw createApiServiceError(
          'Waypoint indices must be whole numbers from -1 to the last waypoint index.'
        );
      }
    }
    for (let waypoint of params.waypoints) {
      if (
        waypoint.serviceTimeInSeconds !== undefined &&
        (!Number.isInteger(waypoint.serviceTimeInSeconds) || waypoint.serviceTimeInSeconds < 0)
      ) {
        throw createApiServiceError(
          'serviceTimeInSeconds must be a non-negative whole number.'
        );
      }
    }
    if (
      params.waypoints.some(waypoint => waypoint.serviceTimeInSeconds !== undefined) &&
      (!params.departAt || params.departAt === 'any')
    ) {
      throw createApiServiceError(
        'Set departAt to now or a date/time when using service times.'
      );
    }
    if (params.traffic === 'live' && params.departAt === 'any') {
      throw createApiServiceError(
        'Live waypoint traffic requires departAt now or a date/time.'
      );
    }
    let body: any = {
      waypoints: params.waypoints.map(w => ({
        point: { latitude: w.lat, longitude: w.lon },
        ...(w.serviceTimeInSeconds !== undefined
          ? { serviceTimeInSeconds: w.serviceTimeInSeconds }
          : {})
      })),
      options: {
        travelMode: params.travelMode || 'car',
        traffic: params.traffic || 'historical',
        ...(params.departAt || params.traffic === 'live'
          ? { departAt: params.departAt ?? 'now' }
          : {}),
        outputExtensions: ['travelTimes', 'routeLengths'],
        waypointConstraints: {
          ...(params.originIndex !== undefined ? { originIndex: params.originIndex } : {}),
          ...(params.destinationIndex !== undefined
            ? { destinationIndex: params.destinationIndex }
            : {})
        }
      }
    };

    let response = await this.axios.post('/routing/waypointoptimization/1', body, {
      params: { key: this.apiKey },
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  // ─── Traffic ──────────────────────────────────────────────────────

  async getTrafficFlowSegment(params: {
    lat: number;
    lon: number;
    zoom: number;
    unit?: string;
    thickness?: number;
    openLr?: boolean;
  }) {
    if (!Number.isInteger(params.zoom)) {
      throw createApiServiceError('Traffic zoom must be a whole number from 0 to 22.');
    }
    let response = await this.axios.get(
      `/traffic/services/4/flowSegmentData/absolute/${params.zoom}/json`,
      {
        params: {
          key: this.apiKey,
          point: `${params.lat},${params.lon}`,
          unit: params.unit,
          thickness: params.thickness,
          openLr: params.openLr
        }
      }
    );
    return response.data;
  }

  async getTrafficIncidents(params: {
    boundingBox: { minLat: number; minLon: number; maxLat: number; maxLon: number };
    language?: string;
    categoryFilter?: string;
    timeValidityFilter?: string;
  }) {
    let bb = params.boundingBox;
    if (bb.minLat >= bb.maxLat || bb.minLon >= bb.maxLon) {
      throw createApiServiceError(
        'Bounding-box minimum coordinates must be below the maximums.'
      );
    }
    let bbox = `${bb.minLon},${bb.minLat},${bb.maxLon},${bb.maxLat}`;
    let response = await this.axios.get(`/traffic/services/5/incidentDetails`, {
      params: {
        key: this.apiKey,
        bbox: bbox,
        fields:
          '{incidents{type,geometry{type,coordinates},properties{id,iconCategory,magnitudeOfDelay,events{description,code,iconCategory},startTime,endTime,from,to,length,delay,roadNumbers,aci{probabilityOfOccurrence,numberOfReports,lastReportTime}}}}',
        language: params.language,
        categoryFilter: params.categoryFilter,
        timeValidityFilter: params.timeValidityFilter
      }
    });
    return response.data;
  }

  // ─── Geofencing ───────────────────────────────────────────────────

  async createProject(params: { name: string }) {
    let response = await this.axios.post(
      '/geofencing/1/projects/project',
      { name: params.name },
      {
        params: {
          key: this.apiKey,
          adminKey: this.adminKey
        },
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async listProjects() {
    let response = await this.axios.get('/geofencing/1/projects', {
      params: {
        key: this.apiKey,
        adminKey: this.adminKey
      }
    });
    return response.data;
  }

  async getProject(projectId: string) {
    let response = await this.axios.get(`/geofencing/1/projects/${projectId}`, {
      params: {
        key: this.apiKey,
        adminKey: this.adminKey
      }
    });
    return response.data;
  }

  async deleteProject(projectId: string) {
    let response = await this.axios.delete(`/geofencing/1/projects/${projectId}`, {
      params: {
        key: this.apiKey,
        adminKey: this.adminKey
      }
    });
    return response.data;
  }

  async createFence(params: {
    projectId: string;
    name: string;
    type: string;
    coordinates?: Array<{ lat: number; lon: number }>;
    centerLat?: number;
    centerLon?: number;
    radius?: number;
    widthInMeters?: number;
  }) {
    let geometry: any;

    if (params.type === 'circle') {
      geometry = {
        type: 'Point',
        coordinates: [params.centerLon, params.centerLat],
        radius: params.radius
      };
    } else if (params.type === 'polygon') {
      let coords = params.coordinates?.map(c => [c.lon, c.lat]) || [];
      if (
        coords.length > 0 &&
        (coords[0]![0] !== coords[coords.length - 1]![0] ||
          coords[0]![1] !== coords[coords.length - 1]![1])
      ) {
        coords.push(coords[0]!);
      }
      geometry = {
        type: 'Polygon',
        coordinates: [coords]
      };
    } else if (params.type === 'corridor') {
      let coords = params.coordinates?.map(c => [c.lon, c.lat]) || [];
      geometry = {
        type: 'LineString',
        coordinates: coords,
        radius: params.widthInMeters || params.radius
      };
    } else if (params.type === 'rectangle') {
      let coords = params.coordinates?.map(c => [c.lon, c.lat]) || [];
      geometry = {
        type: 'Polygon',
        coordinates: [coords]
      };
    }

    let response = await this.axios.post(
      `/geofencing/1/projects/${params.projectId}/fence`,
      {
        name: params.name,
        type: 'Feature',
        geometry,
        properties: {}
      },
      {
        params: {
          key: this.apiKey,
          adminKey: this.adminKey
        },
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async listFences(projectId: string) {
    let response = await this.axios.get(`/geofencing/1/projects/${projectId}/fences`, {
      params: {
        key: this.apiKey,
        adminKey: this.adminKey
      }
    });
    return response.data;
  }

  async getFence(params: { projectId: string; fenceId: string }) {
    let response = await this.axios.get(
      `/geofencing/1/projects/${params.projectId}/fence/${params.fenceId}`,
      {
        params: {
          key: this.apiKey,
          adminKey: this.adminKey
        }
      }
    );
    return response.data;
  }

  async deleteFence(params: { projectId: string; fenceId: string }) {
    let response = await this.axios.delete(
      `/geofencing/1/projects/${params.projectId}/fence/${params.fenceId}`,
      {
        params: {
          key: this.apiKey,
          adminKey: this.adminKey
        }
      }
    );
    return response.data;
  }

  async reportObjectPosition(params: {
    lat: number;
    lon: number;
    objectId: string;
    projectId: string;
  }) {
    let response = await this.axios.get('/geofencing/1/report', {
      params: {
        key: this.apiKey,
        adminKey: this.adminKey,
        point: `${params.lat},${params.lon}`,
        object: params.objectId,
        project: params.projectId
      }
    });
    return response.data;
  }

  async getTransitions(params: {
    objectId: string;
    projectId?: string;
    fenceId?: string;
    limit?: number;
  }) {
    let response = await this.axios.get('/geofencing/1/transitions', {
      params: {
        key: this.apiKey,
        adminKey: this.adminKey,
        object: params.objectId,
        project: params.projectId,
        fence: params.fenceId,
        limit: params.limit
      }
    });
    return response.data;
  }

  // ─── Location History ─────────────────────────────────────────────

  async createObject(params: { objectName: string }) {
    let response = await this.axios.post(
      '/locationHistory/1/objects/object',
      {
        name: params.objectName
      },
      {
        params: {
          key: this.apiKey,
          adminKey: this.adminKey
        },
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async listObjects() {
    let response = await this.axios.get('/locationHistory/1/objects', {
      params: {
        key: this.apiKey,
        adminKey: this.adminKey
      }
    });
    return response.data;
  }

  async getObjectLocationHistory(params: {
    objectId: string;
    from?: string;
    to?: string;
    maxResult?: number;
    pageNumber?: number;
  }) {
    if (!params.from) {
      throw createApiServiceError('Provide from to retrieve Location History positions.');
    }
    if (!this.adminKey) {
      throw createApiServiceError(
        'Provide an Admin Key to retrieve Location History positions.'
      );
    }
    let response = await this.axios.get(
      `/locationHistory/1/history/positions/${encodeURIComponent(params.objectId)}`,
      {
        params: {
          key: this.apiKey,
          adminKey: this.adminKey,
          from: params.from,
          to: params.to,
          maxResult: params.maxResult,
          pageNumber: params.pageNumber
        }
      }
    );
    return response.data;
  }

  async reportObjectLocation(params: {
    objectId: string;
    lat: number;
    lon: number;
    timestamp?: string;
    speed?: number;
    heading?: number;
  }) {
    if (params.speed !== undefined || params.heading !== undefined) {
      throw createApiServiceError(
        'Location History estimates speed and heading from positions; omit speed and heading.'
      );
    }
    let response = await this.axios.post(
      '/locationHistory/1/history/positions',
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [params.lon, params.lat]
        },
        object: params.objectId,
        ...(params.timestamp ? { timestamp: params.timestamp } : {})
      },
      {
        params: {
          key: this.apiKey,
          adminKey: this.adminKey
        },
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  // ─── Snap to Roads ────────────────────────────────────────────────

  async snapToRoads(params: {
    points: Array<{ lat: number; lon: number; timestamp?: string }>;
    fieldSet?: string;
  }) {
    if (params.points.length < 2 || params.points.length > 5000) {
      throw createApiServiceError('Snap to Roads requires between 2 and 5,000 points.');
    }
    let response = await this.axios.post(
      '/snapToRoads/1',
      {
        points: params.points.map(p => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
          properties: p.timestamp ? { timestamp: p.timestamp } : {}
        }))
      },
      {
        params: {
          key: this.apiKey,
          fields:
            params.fieldSet ??
            '{projectedPoints{type,geometry{type,coordinates},properties{routeIndex,snapResult}},route{properties{speedLimits{value,unit,type},address{roadName,roadNumbers}}}}',
          measurementSystem: 'metric'
        },
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  // ─── Notifications ────────────────────────────────────────────────

  async createContactGroup(params: {
    name: string;
    webhookUrls?: string[];
    emailAddresses?: string[];
  }) {
    let contacts: Array<{ type: string; value: string }> = [];
    if (params.webhookUrls) {
      for (let url of params.webhookUrls) {
        contacts.push({ type: 'webhook', value: url });
      }
    }
    if (params.emailAddresses) {
      for (let email of params.emailAddresses) {
        contacts.push({ type: 'email', value: email });
      }
    }

    let response = await this.axios.post(
      '/notifications/1/groups/group',
      {
        name: params.name,
        contacts
      },
      {
        params: {
          key: this.apiKey,
          adminKey: this.adminKey
        },
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async listContactGroups() {
    let response = await this.axios.get('/notifications/1/groups', {
      params: {
        key: this.apiKey,
        adminKey: this.adminKey
      }
    });
    return response.data;
  }

  async getContactGroup(groupId: string) {
    let response = await this.axios.get(`/notifications/1/groups/${groupId}`, {
      params: {
        key: this.apiKey,
        adminKey: this.adminKey
      }
    });
    return response.data;
  }

  async deleteContactGroup(groupId: string) {
    let response = await this.axios.delete(`/notifications/1/groups/${groupId}`, {
      params: {
        key: this.apiKey,
        adminKey: this.adminKey
      }
    });
    return response.data;
  }

  async updateContactGroup(params: {
    groupId: string;
    name?: string;
    webhookUrls?: string[];
    emailAddresses?: string[];
  }) {
    let contacts: Array<{ type: string; value: string }> = [];
    if (params.webhookUrls) {
      for (let url of params.webhookUrls) {
        contacts.push({ type: 'webhook', value: url });
      }
    }
    if (params.emailAddresses) {
      for (let email of params.emailAddresses) {
        contacts.push({ type: 'email', value: email });
      }
    }

    let body: any = {};
    if (params.name) body.name = params.name;
    if (contacts.length > 0) body.contacts = contacts;

    let response = await this.axios.put(`/notifications/1/groups/${params.groupId}`, body, {
      params: {
        key: this.apiKey,
        adminKey: this.adminKey
      },
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  // ─── Geofence Alerts ──────────────────────────────────────────────

  async createAlert(params: {
    projectId: string;
    fenceId: string;
    objectId: string;
    notificationGroupId: string;
    type: string;
  }) {
    let response = await this.axios.post(
      `/geofencing/1/projects/${params.projectId}/fence/${params.fenceId}/alerts/alert`,
      {
        object: params.objectId,
        notificationGroup: params.notificationGroupId,
        type: params.type
      },
      {
        params: {
          key: this.apiKey,
          adminKey: this.adminKey
        },
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async listAlerts(params: { projectId: string; fenceId: string }) {
    let response = await this.axios.get(
      `/geofencing/1/projects/${params.projectId}/fence/${params.fenceId}/alerts`,
      {
        params: {
          key: this.apiKey,
          adminKey: this.adminKey
        }
      }
    );
    return response.data;
  }

  async deleteAlert(params: { projectId: string; fenceId: string; alertId: string }) {
    let response = await this.axios.delete(
      `/geofencing/1/projects/${params.projectId}/fence/${params.fenceId}/alerts/${params.alertId}`,
      {
        params: {
          key: this.apiKey,
          adminKey: this.adminKey
        }
      }
    );
    return response.data;
  }
}
