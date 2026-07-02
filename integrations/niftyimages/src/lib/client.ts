import { createAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.niftyimages.com/v1',
      headers: {
        ApiKey: config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ==================== Data Store ====================

  async getDataStoreFields(dataStoreApiKey: string): Promise<any[]> {
    let response = await this.axios.get('/DataStores/Fields', {
      params: { ApiKey: dataStoreApiKey }
    });
    return response.data;
  }

  async addDataStoreRecord(dataStoreApiKey: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/DataStores/AddRecord', data, {
      params: { ApiKey: dataStoreApiKey }
    });
    return response.data;
  }

  async deleteDataStoreRecordById(dataStoreApiKey: string, recordId: string): Promise<any> {
    let response = await this.axios.delete(`/DataStores/DeleteById/${recordId}`, {
      params: { ApiKey: dataStoreApiKey }
    });
    return response.data;
  }

  async deleteDataStoreRecord(
    dataStoreApiKey: string,
    matchCriteria: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.post('/DataStores/DeleteRecord', matchCriteria, {
      params: { ApiKey: dataStoreApiKey }
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

    let response = await this.axios.put('/Timer/UpdateTargetDate', body, {
      params: { ApiKey: params.timerApiKey }
    });
    return response.data;
  }

  // ==================== Maps ====================

  async getAllMaps(): Promise<any[]> {
    let response = await this.axios.get('/Maps');
    return response.data;
  }

  async getMapDetails(mapId: string): Promise<any> {
    let response = await this.axios.get(`/Maps/${mapId}`);
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
    let response = await this.axios.get(`/Maps/${mapId}/Locations/Search`, {
      params
    });
    return response.data;
  }

  async addMapLocation(mapId: string, location: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/Maps/${mapId}/Locations`, location);
    return response.data;
  }

  async updateMapLocation(
    mapId: string,
    locationId: string,
    location: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.put(`/Maps/${mapId}/Locations/${locationId}`, location);
    return response.data;
  }

  async deleteMapLocation(mapId: string, locationId: string): Promise<any> {
    let response = await this.axios.delete(`/Maps/${mapId}/Locations/${locationId}`);
    return response.data;
  }

  // ==================== Images ====================

  async listImages(params: { page?: number; pageSize?: number }): Promise<any> {
    let response = await this.axios.get('/Images', {
      params
    });
    return response.data;
  }

  async getImageStats(params: { startDate?: string; endDate?: string }): Promise<any> {
    let response = await this.axios.get('/Images/Stats', {
      params
    });
    return response.data;
  }

  async getImageDetails(imageId: string): Promise<any> {
    let response = await this.axios.get(`/Images/${imageId}`);
    return response.data;
  }

  async deleteImage(imageId: string): Promise<any> {
    let response = await this.axios.delete(`/Images/${imageId}`);
    return response.data;
  }

  // ==================== Photoshop ====================

  async getPhotoshopLayers(imageId: string): Promise<any> {
    let response = await this.axios.get(`/Photoshop/${imageId}/Layers`);
    return response.data;
  }

  async updatePhotoshopImage(imageId: string, layers: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/Photoshop/${imageId}`, layers);
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
    let response = await this.axios.get(`/Widgets/${widgetKey}`, {
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
    let response = await this.axios.get(`/Widgets/${widgetKey}/Images`, {
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
    let response = await this.axios.get(`/Widgets/${widgetKey}/Users`, {
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
    let response = await this.axios.get(`/Widgets/${widgetKey}/Users/${user}`, {
      params
    });
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
    let response = await this.axios.get(`/Widgets/${widgetKey}/Images/${user}`, {
      params
    });
    return response.data;
  }

  async suspendWidgetUser(widgetKey: string, user: string): Promise<any> {
    let response = await this.axios.put(`/Widgets/${widgetKey}/Users/${user}/Suspend`);
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

  async getBeePluginUsers(): Promise<any[]> {
    let response = await this.axios.get('/BeePlugin/Users');
    return response.data;
  }

  async getBeePluginUserImages(user: string): Promise<any> {
    let response = await this.axios.get(`/BeePlugin/Users/${user}/Images`);
    return response.data;
  }

  async suspendBeePluginUser(user: string): Promise<any> {
    let response = await this.axios.put(`/BeePlugin/Users/${user}/Suspend`);
    return response.data;
  }
}
