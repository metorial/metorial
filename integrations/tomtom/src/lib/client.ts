import { createAxios } from 'slates';

export class TomTomClient {
  private axios: ReturnType<typeof createAxios>;
  private apiKey: string;
  private adminKey?: string;

  constructor(config: { token: string; adminKey?: string }) {
    this.apiKey = config.token;
    this.adminKey = config.adminKey;
    this.axios = createAxios({
      baseURL: 'https://api.tomtom.com'
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
    avoid?: string[];
  }) {
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
        vehicleEngineType: params.vehicleEngineType,
        vehicleMaxSpeed: params.vehicleMaxSpeed,
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
          departAt: params.departAt,
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
        ...(params.departAt ? { departAt: params.departAt } : {}),
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
    let bbox = `${bb.minLat},${bb.minLon},${bb.maxLat},${bb.maxLon}`;
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
    let response = await this.axios.post('/geofencing/1/projects/project', null, {
      params: {
        key: this.apiKey,
        adminKey: this.adminKey
      },
      headers: { 'Content-Type': 'application/json' },
      data: { name: params.name }
    });
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

  async getObjectLocationHistory(params: { objectId: string; from?: string; to?: string }) {
    let response = await this.axios.get(
      `/locationHistory/1/objects/${params.objectId}/positions`,
      {
        params: {
          key: this.apiKey,
          adminKey: this.adminKey,
          from: params.from,
          to: params.to
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
    let response = await this.axios.post(
      `/locationHistory/1/objects/${params.objectId}/positions/position`,
      {
        position: {
          latitude: params.lat,
          longitude: params.lon
        },
        ...(params.timestamp ? { timestamp: params.timestamp } : {}),
        ...(params.speed !== undefined ? { speed: params.speed } : {}),
        ...(params.heading !== undefined ? { heading: params.heading } : {})
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
    let response = await this.axios.post(
      '/snap-to-roads/1/snap-to-roads',
      {
        points: params.points.map(p => ({
          latitude: p.lat,
          longitude: p.lon,
          ...(p.timestamp ? { timestamp: p.timestamp } : {})
        }))
      },
      {
        params: {
          key: this.apiKey,
          fields: params.fieldSet
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
