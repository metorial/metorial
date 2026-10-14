import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

type Location = {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  url?: string;
  icon?: string;
  properties?: { name: string; value: unknown }[];
};

type LocationIdType = 'nifty_id' | 'location_id';

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private v2: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    let errorAdapter = (error: unknown) =>
      buildApiServiceError(error, {
        providerLabel: 'NiftyImages',
        reason: 'niftyimages_api_error'
      });
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.niftyimages.com/v1',
      authHeader: { name: 'ApiKey', value: config.token },
      timeout: 30000,
      errorAdapter
    });
    this.v2 = createAuthenticatedAxios({
      baseURL: 'https://dev.niftyimages.com/v2',
      authHeader: { value: `Bearer ${config.token}` },
      timeout: 30000,
      errorAdapter
    });
  }

  async getCurrentUser(): Promise<{
    email: string | null;
    apiKeyID: string | null;
    name: string | null;
  }> {
    let response = await this.v2.get('/whoami');
    return response.data;
  }

  private async getImageUrl(imageId: string): Promise<string> {
    if (/^https?:\/\//i.test(imageId)) return imageId;
    if (!/^\d+$/.test(imageId)) {
      throw createApiServiceError(
        'Provide a numeric image ID or the image URL returned by List Images or List Maps.'
      );
    }
    let response = await this.v2.get<{ url: string | null }>(
      `/images/${encodeURIComponent(imageId)}`
    );
    if (!response.data.url) {
      throw createApiServiceError(
        'This image has no active rendering URL. Select an active image.'
      );
    }
    return response.data.url;
  }

  private getLocationPayload(location: Location): Record<string, unknown> {
    let body: Record<string, unknown> = {};
    let address = [
      location.address,
      location.city,
      location.state,
      location.zip,
      location.country
    ]
      .filter(value => value !== undefined && value !== '')
      .join(', ');
    if (address) body.Address = address;
    if (location.latitude !== undefined) body.Latitude = location.latitude;
    if (location.longitude !== undefined) body.Longitude = location.longitude;

    let properties = new Map<string, unknown>();
    for (let [name, value] of [
      ['Name', location.name],
      ['Phone', location.phone],
      ['StoreWebPage', location.url],
      ['Icon', location.icon]
    ] as const) {
      if (value !== undefined) properties.set(name, value);
    }
    for (let property of location.properties ?? []) {
      properties.set(property.name, property.value);
    }
    if (properties.size) {
      body.Properties = [...properties].map(([Name, Value]) => ({ Name, Value }));
    }
    return body;
  }

  // ==================== Data Store ====================

  async getDataStoreFields(dataStoreApiKey: string): Promise<any[]> {
    let response = await this.axios.get('/Store', {
      headers: { ApiKey: dataStoreApiKey }
    });
    return response.data;
  }

  async addDataStoreRecord(dataStoreApiKey: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/Store/AddRecord', data, {
      headers: { ApiKey: dataStoreApiKey }
    });
    return response.data;
  }

  async deleteDataStoreRecordById(dataStoreApiKey: string, recordId: string): Promise<any> {
    let response = await this.axios.delete('/Store/DeleteID', {
      headers: { ApiKey: dataStoreApiKey },
      params: { id: recordId }
    });
    return response.data;
  }

  async deleteDataStoreRecord(
    dataStoreApiKey: string,
    matchCriteria: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.delete('/Store/DeleteRecord', {
      data: matchCriteria,
      headers: { ApiKey: dataStoreApiKey }
    });
    return response.data;
  }

  // ==================== Timer ====================

  async updateTimerTargetDate(params: {
    timerApiKey: string;
    timerImageUrl: string;
    targetDate: string;
    format?: string;
    isUtc?: boolean;
    addHours?: number;
    addMinutes?: number;
    addDays?: number;
    addMonths?: number;
  }): Promise<any> {
    let body: Record<string, any> = {
      TimerImageUrl: params.timerImageUrl,
      TargetDate: params.targetDate
    };
    if (params.format !== undefined) body.Format = params.format;
    if (params.isUtc !== undefined) body.IsUtc = params.isUtc;
    if (params.addHours !== undefined) body.AddHours = params.addHours;
    if (params.addMinutes !== undefined) body.AddMinutes = params.addMinutes;
    if (params.addDays !== undefined) body.AddDays = params.addDays;
    if (params.addMonths !== undefined) body.AddMonths = params.addMonths;

    let response = await this.axios.put('/Timer/Update', body, {
      headers: { ApiKey: params.timerApiKey }
    });
    return response.data;
  }

  // ==================== Maps ====================

  async getAllMaps(): Promise<any[]> {
    let response = await this.axios.get('/Maps');
    return response.data;
  }

  async getMapDetails(mapId: string): Promise<any> {
    let url = await this.getImageUrl(mapId);
    let response = await this.axios.get('/Maps/Details', { params: { url } });
    return response.data;
  }

  async searchMapLocations(
    mapId: string,
    params: {
      latitude?: number;
      longitude?: number;
      radius?: number;
      query?: string;
    }
  ): Promise<any[]> {
    let url = await this.getImageUrl(mapId);
    let response = await this.axios.get('/Maps/GetLocations', {
      params: {
        url,
        lat: params.latitude,
        lng: params.longitude,
        radius: params.radius,
        address: params.query
      }
    });
    return response.data;
  }

  async addMapLocation(mapId: string, location: Location): Promise<any> {
    let url = await this.getImageUrl(mapId);
    let response = await this.axios.post(
      '/Maps/AddLocation',
      this.getLocationPayload(location),
      {
        params: { url }
      }
    );
    return response.data;
  }

  async updateMapLocation(
    mapId: string,
    locationId: string,
    location: Location,
    locationIdType: LocationIdType = 'nifty_id'
  ): Promise<any> {
    let url = await this.getImageUrl(mapId);
    let body = this.getLocationPayload(location);
    body[locationIdType === 'nifty_id' ? 'NiftyID' : 'LocationID'] = locationId;
    let response = await this.axios.put('/Maps/UpdateLocation', body, { params: { url } });
    return response.data;
  }

  async deleteMapLocation(
    mapId: string,
    locationId: string,
    locationIdType: LocationIdType = 'nifty_id'
  ): Promise<any> {
    let url = await this.getImageUrl(mapId);
    let response = await this.axios.delete('/Maps/DeleteLocation', {
      params: {
        url,
        [locationIdType === 'nifty_id' ? 'niftyID' : 'locationID']: locationId
      }
    });
    return response.data;
  }

  // ==================== Images ====================

  async listImages(params: { page?: number; pageSize?: number }): Promise<any> {
    let response = await this.axios.get('/Images', {
      params: { pageNumber: params.page, pageSize: params.pageSize }
    });
    return response.data;
  }

  async getImageStats(params: { startDate?: string; endDate?: string }): Promise<any> {
    let response = await this.axios.get('/Images/AllStats', {
      params
    });
    return response.data;
  }

  async getImageDetails(imageId: string): Promise<any> {
    let url = await this.getImageUrl(imageId);
    let response = await this.axios.get('/Image', { params: { url } });
    return response.data;
  }

  async deleteImage(imageId: string): Promise<any> {
    let url = await this.getImageUrl(imageId);
    let response = await this.axios.delete('/Image', { params: { url } });
    return response.data;
  }

  // ==================== Photoshop ====================

  async getPhotoshopLayers(imageId: string): Promise<any> {
    let url = await this.getImageUrl(imageId);
    let response = await this.axios.get('/Psd', { params: { url } });
    return response.data;
  }

  async updatePhotoshopImage(imageId: string, layers: Record<string, any>): Promise<any> {
    let url = await this.getImageUrl(imageId);
    let updates = Object.entries(layers).map(([LayerName, value]) => {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        return { ...value, LayerName };
      }
      if (typeof value === 'boolean') return { LayerName, Hide: value };
      if (typeof value === 'string' || typeof value === 'number') {
        return { LayerName, TextValue: String(value) };
      }
      throw createApiServiceError(
        'Each layer value must be text, a visibility boolean, or an object containing the documented layer properties.'
      );
    });
    let response = await this.axios.put('/Psd', { Layers: updates }, { params: { url } });
    return response.data;
  }

  // ==================== Widgets ====================

  async listWidgets(): Promise<any[]> {
    let response = await this.axios.get('/Widgets');
    return response.data;
  }

  async getWidgetStats(
    widgetKey: string,
    params: {
      startDate?: string;
      endDate?: string;
    }
  ): Promise<any> {
    let response = await this.axios.get(`/Widgets/${encodeURIComponent(widgetKey)}`, {
      params
    });
    return response.data;
  }

  async getWidgetImages(
    widgetKey: string,
    params: {
      startDate?: string;
      endDate?: string;
    }
  ): Promise<any> {
    let response = await this.axios.get(`/Widgets/${encodeURIComponent(widgetKey)}/Images`, {
      params
    });
    return response.data;
  }

  async getWidgetUsers(
    widgetKey: string,
    params: {
      startDate?: string;
      endDate?: string;
    }
  ): Promise<any[]> {
    let response = await this.axios.get(`/Widgets/${encodeURIComponent(widgetKey)}/Users`, {
      params
    });
    return response.data;
  }

  async getWidgetUserStats(
    widgetKey: string,
    user: string,
    params: {
      startDate?: string;
      endDate?: string;
    }
  ): Promise<any> {
    let response = await this.axios.get(
      `/Widgets/${encodeURIComponent(widgetKey)}/Users/${encodeURIComponent(user)}`,
      {
        params
      }
    );
    return response.data;
  }

  async getWidgetUserImages(
    widgetKey: string,
    user: string,
    params: {
      startDate?: string;
      endDate?: string;
    }
  ): Promise<any> {
    let response = await this.axios.get(
      `/Widgets/${encodeURIComponent(widgetKey)}/Images/${encodeURIComponent(user)}`,
      {
        params
      }
    );
    return response.data;
  }

  async suspendWidgetUser(widgetKey: string, user: string): Promise<any> {
    let response = await this.axios.put(
      `/Widgets/${encodeURIComponent(widgetKey)}/Users/${encodeURIComponent(user)}`,
      'true'
    );
    return response.data;
  }

  // ==================== Widget Stats (Aggregated) ====================

  async getAllWidgetStats(params: { startDate?: string; endDate?: string }): Promise<any> {
    let response = await this.axios.get('/Widgets/AllStats', {
      params
    });
    return response.data;
  }

  // ==================== Bee Plugin ====================

  async getBeePluginUsers(
    pluginKey: string,
    params: { startDate?: string; endDate?: string } = {}
  ): Promise<any[]> {
    let response = await this.axios.get(`/BeePlugin/${encodeURIComponent(pluginKey)}/Users`, {
      params
    });
    return response.data;
  }

  async getBeePluginUserImages(pluginKey: string, user: string): Promise<any> {
    let response = await this.axios.get(
      `/BeePlugin/${encodeURIComponent(pluginKey)}/Users/${encodeURIComponent(user)}`
    );
    return response.data;
  }

  async suspendBeePluginUser(pluginKey: string, user: string): Promise<any> {
    let response = await this.axios.put(
      `/BeePlugin/${encodeURIComponent(pluginKey)}/Users/${encodeURIComponent(user)}`,
      'true'
    );
    return response.data;
  }
}
