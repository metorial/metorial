import { createAxios } from 'slates';

let BASE_URL = 'https://api.minerstat.com/v2';

export class DeveloperClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { developerApiKey: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        'X-API-Key': config.developerApiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  async getCoins(params?: { list?: string; algo?: string }): Promise<CoinData[]> {
    let response = await this.axios.get('/coins', { params });
    return response.data;
  }

  async getHardware(params?: { type?: string; brand?: string }): Promise<HardwareData[]> {
    let response = await this.axios.get('/hardware', { params });
    return response.data;
  }

  async getPools(params?: { coin?: string; type?: string }): Promise<PoolData[]> {
    let response = await this.axios.get('/pools', { params });
    return response.data;
  }
}

export class MonitoringClient {
  private axios: ReturnType<typeof createAxios>;
  private accessKey: string;

  constructor(config: { accessKey: string }) {
    this.accessKey = config.accessKey;
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async listWorkers(): Promise<Record<string, WorkerData>> {
    let response = await this.axios.get(`/stats/${this.accessKey}`);
    return response.data;
  }

  async getWorker(workerName: string): Promise<Record<string, WorkerData>> {
    let response = await this.axios.get(`/stats/${this.accessKey}/${workerName}`);
    return response.data;
  }

  async getWorkerHashrate(
    workerName: string,
    params?: { tz?: string }
  ): Promise<Record<string, any>> {
    let response = await this.axios.get(`/stats/${this.accessKey}/${workerName}/hashrate`, {
      params
    });
    return response.data;
  }

  async getWorkerStatistics(
    workerName: string,
    params?: { tz?: string }
  ): Promise<Record<string, any>> {
    let response = await this.axios.get(`/stats/${this.accessKey}/${workerName}/statistics`, {
      params
    });
    return response.data;
  }

  async getWorkerActivity(workerName: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/stats/${this.accessKey}/${workerName}/activity`);
    return response.data;
  }

  async getGroupStatistics(
    groupName: string,
    params?: { tz?: string }
  ): Promise<Record<string, any>> {
    let response = await this.axios.get(`/stats/${this.accessKey}/group/${groupName}`, {
      params
    });
    return response.data;
  }

  async getGlobalStatistics(params?: { tz?: string }): Promise<Record<string, any>> {
    let response = await this.axios.get(`/stats/${this.accessKey}/global`, { params });
    return response.data;
  }

  async get24hLogs(): Promise<Record<string, any>> {
    let response = await this.axios.get(`/stats/${this.accessKey}/24h`);
    return response.data;
  }

  async getBalanceStatistics(params?: { tz?: string }): Promise<Record<string, any>> {
    let response = await this.axios.get(`/stats/${this.accessKey}/balance`, { params });
    return response.data;
  }
}

export class ManagementClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Worker endpoints
  async getWorker(params?: { name?: string; group?: string; user?: number }): Promise<any> {
    let response = await this.axios.get('/worker', { params });
    return response.data;
  }

  async createWorker(data: CreateWorkerParams): Promise<any> {
    let response = await this.axios.post('/worker', data);
    return response.data;
  }

  async updateWorker(data: UpdateWorkerParams): Promise<any> {
    let response = await this.axios.patch('/worker', data);
    return response.data;
  }

  async deleteWorker(data: { name?: string; group?: string; user?: number }): Promise<any> {
    let response = await this.axios.delete('/worker', { data });
    return response.data;
  }

  async executeCommand(data: ExecuteCommandParams): Promise<any> {
    let response = await this.axios.patch('/worker', data);
    return response.data;
  }

  // Tag endpoints
  async getTags(params?: { user?: number; type?: string }): Promise<any> {
    let response = await this.axios.get('/tag', { params });
    return response.data;
  }

  async createTag(data: { tag: string; address: string; user?: number }): Promise<any> {
    let response = await this.axios.post('/tag', data);
    return response.data;
  }

  async updateTag(data: { tag: string; address: string; user?: number }): Promise<any> {
    let response = await this.axios.patch('/tag', data);
    return response.data;
  }

  async deleteTag(data: { tag: string; user?: number }): Promise<any> {
    let response = await this.axios.delete('/tag', { data });
    return response.data;
  }

  // Customer endpoints
  async getCustomers(params?: { user?: number; fields?: string }): Promise<any> {
    let response = await this.axios.get('/customer', { params });
    return response.data;
  }

  async createCustomer(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/customer', data);
    return response.data;
  }

  async updateCustomer(data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch('/customer', data);
    return response.data;
  }

  async deleteCustomer(data: { user: number }): Promise<any> {
    let response = await this.axios.delete('/customer', { data });
    return response.data;
  }

  // ClockTune endpoints
  async getClockTuneProfiles(params?: {
    user?: number;
    id?: number;
    name?: string;
  }): Promise<any> {
    let response = await this.axios.get('/clocktune', { params });
    return response.data;
  }

  async createClockTuneProfile(data: {
    name: string;
    values: string;
    user?: number;
  }): Promise<any> {
    let response = await this.axios.post('/clocktune', data);
    return response.data;
  }

  async updateClockTuneProfile(data: {
    id: number;
    values: string;
    name?: string;
  }): Promise<any> {
    let response = await this.axios.patch('/clocktune', data);
    return response.data;
  }

  async deleteClockTuneProfile(data: { id: number }): Promise<any> {
    let response = await this.axios.delete('/clocktune', { data });
    return response.data;
  }
}

// Types

export interface CoinData {
  id: string;
  coin: string;
  name: string;
  type: string;
  algorithm: string;
  network_hashrate: number;
  difficulty: number;
  reward: number;
  reward_unit: string;
  reward_block: number;
  price: number;
  volume: number;
  updated: number;
}

export interface HardwareData {
  id: string;
  name: string;
  url: string;
  type: string;
  brand: string;
  algorithms: Record<string, { hashrate: number; power: number }>;
  specs: Record<string, any>;
}

export interface PoolData {
  id: string;
  name: string;
  url: string;
  description: string;
  website: string;
  founded: string;
  type: string;
  coins: Record<string, PoolCoinInfo>;
}

export interface PoolCoinInfo {
  algorithm: string;
  payoutThreshold: string;
  rewardMethod: string;
  fee: string;
  anonymous: boolean;
  registration: boolean;
}

export interface WorkerData {
  info: {
    type: string;
    system: string;
    status: string;
    uptime: number;
    sync: number;
    groups: string;
    devices: number;
    consumption: number;
    os: {
      cpuTemp: number;
      cpuLoad: number;
      freeSpace: number;
      freeMemory: number;
      localIp: string;
    };
    mining: {
      client: string;
      coin: string;
      dualCoin: string;
      cpuCoin: string;
    };
    hashrate: {
      main: { hashrate: number; unit: string };
      dual: { hashrate: number; unit: string };
      cpu: { hashrate: number; unit: string };
    };
    shares: {
      main: { accepted: number; rejected: number };
      dual: { accepted: number; rejected: number };
      cpu: { accepted: number; rejected: number };
    };
    revenue: {
      main: number;
      dual: number;
      cpu: number;
    };
    electricityRate: number;
    hotLimit: number;
    veryHotLimit: number;
  };
  hardware: Array<{
    name: string;
    temperature: number;
    chipTemperature: number;
    memoryTemperature: number;
    fan: number;
    power: number;
  }>;
}

export interface CreateWorkerParams {
  name: string;
  type: 'nvidia' | 'amd' | 'asic';
  system: string;
  ip?: string;
  username?: string;
  password?: string;
  group?: string;
  user?: number;
  config?: string;
  client?: string;
}

export interface UpdateWorkerParams {
  name?: string;
  group?: string;
  user?: number;
  set?: Record<string, any>;
  add?: Record<string, any>;
  remove?: Record<string, any>;
  command?: string;
}

export interface ExecuteCommandParams {
  name?: string;
  group?: string;
  user?: number;
  command: 'shutdown' | 'reboot' | 'restart' | 'stop' | 'start' | 'exec';
  exec?: string;
}
