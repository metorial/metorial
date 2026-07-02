import { createAxios } from 'slates';

export class SensiboClient {
  private http;

  constructor(token: string) {
    this.http = createAxios({
      baseURL: 'https://home.sensibo.com/api/v2',
      params: {
        apiKey: token
      }
    });
  }

  // ── Device Management ──

  async listDevices(fields: string = '*'): Promise<any[]> {
    let response = await this.http.get('/users/me/pods', {
      params: { fields }
    });
    return response.data.result;
  }

  async getDevice(deviceId: string, fields: string = '*'): Promise<any> {
    let response = await this.http.get(`/pods/${deviceId}`, {
      params: { fields }
    });
    return response.data.result;
  }

  // ── AC State Control ──

  async setAcState(deviceId: string, acState: Record<string, any>): Promise<any> {
    let response = await this.http.post(`/pods/${deviceId}/acStates`, {
      acState
    });
    return response.data.result;
  }

  async setAcStateProperty(deviceId: string, property: string, value: any): Promise<any> {
    let response = await this.http.patch(`/pods/${deviceId}/acStates/${property}`, {
      newValue: value
    });
    return response.data.result;
  }

  async getAcStates(deviceId: string, limit: number = 10): Promise<any[]> {
    let response = await this.http.get(`/pods/${deviceId}/acStates`, {
      params: { limit }
    });
    return response.data.result;
  }

  // ── Environmental Measurements ──

  async getHistoricalMeasurements(deviceId: string, days: number = 1): Promise<any[]> {
    let response = await this.http.get(`/pods/${deviceId}/historicalMeasurements`, {
      params: { days }
    });
    return response.data.result;
  }

  // ── Timers ──

  async getTimer(deviceId: string): Promise<any> {
    let response = await this.http.get(`/pods/${deviceId}/timer`);
    return response.data.result;
  }

  async setTimer(deviceId: string, timer: Record<string, any>): Promise<any> {
    let response = await this.http.put(`/pods/${deviceId}/timer`, timer);
    return response.data.result;
  }

  async deleteTimer(deviceId: string): Promise<void> {
    await this.http.delete(`/pods/${deviceId}/timer`);
  }

  // ── Schedules ──

  async listSchedules(deviceId: string): Promise<any[]> {
    let response = await this.http.get(`/pods/${deviceId}/schedules`);
    return response.data.result;
  }

  async createSchedule(deviceId: string, schedule: Record<string, any>): Promise<any> {
    let response = await this.http.post(`/pods/${deviceId}/schedules`, schedule);
    return response.data.result;
  }

  async getSchedule(deviceId: string, scheduleId: string): Promise<any> {
    let response = await this.http.get(`/pods/${deviceId}/schedules/${scheduleId}`);
    return response.data.result;
  }

  async updateSchedule(
    deviceId: string,
    scheduleId: string,
    schedule: Record<string, any>
  ): Promise<any> {
    let response = await this.http.put(`/pods/${deviceId}/schedules/${scheduleId}`, schedule);
    return response.data.result;
  }

  async deleteSchedule(deviceId: string, scheduleId: string): Promise<void> {
    await this.http.delete(`/pods/${deviceId}/schedules/${scheduleId}`);
  }

  // ── Climate React (Smart Mode) ──

  async getClimateReact(deviceId: string): Promise<any> {
    let response = await this.http.get(`/pods/${deviceId}/smartMode`);
    return response.data.result;
  }

  async updateClimateReact(deviceId: string, settings: Record<string, any>): Promise<any> {
    let response = await this.http.put(`/pods/${deviceId}/smartMode`, settings);
    return response.data.result;
  }

  async configureClimateReact(deviceId: string, settings: Record<string, any>): Promise<any> {
    let response = await this.http.post(`/pods/${deviceId}/smartMode`, settings);
    return response.data.result;
  }

  // ── Events ──

  async getDeviceEvents(deviceId: string, days: number = 1): Promise<any[]> {
    let response = await this.http.get(`/pods/${deviceId}/events`, {
      params: { days }
    });
    return response.data.result;
  }

  // ── Door/Window Sensor Events ──

  async getDoorSensorEvents(deviceId: string, days: number = 1): Promise<any[]> {
    let response = await this.http.get(`/pods/${deviceId}/doorSensors/events`, {
      params: { days }
    });
    return response.data.result;
  }
}
