import { createAxios } from 'slates';

let BASE_URL = 'https://mxtoolbox.com/api/v1';

export interface LookupResultEntry {
  id: number;
  name: string;
  info: string;
  url: string;
}

export interface LookupResponse {
  uid: string;
  command: string;
  commandArgument: string;
  timeRecorded: string;
  reportingNameServer: string;
  timeToComplete: string;
  hasSubscriptions: boolean;
  failed: LookupResultEntry[];
  warnings: LookupResultEntry[];
  passed: LookupResultEntry[];
  timeouts: LookupResultEntry[];
  errors: string[];
  information: LookupResultEntry[];
  isTransitioned: boolean;
  relatedLookups: { name: string; url: string }[];
}

export interface Monitor {
  monitorUid: string;
  actionString: string;
  lastTransition: string;
  lastChecked: string;
  mxRep: string;
  failing: string[];
  warnings: string[];
}

export interface UsageResponse {
  used: number;
  limit: number;
}

export class Client {
  private axios;

  constructor(private token: string) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: this.token,
        'Content-Type': 'application/json'
      }
    });
  }

  async lookup(command: string, argument: string): Promise<LookupResponse> {
    let url = `/Lookup/${command}/?argument=${encodeURIComponent(argument)}`;
    let response = await this.axios.get(url);
    let data = response.data;
    return {
      uid: data.UID ?? data.uid ?? '',
      command: data.Command ?? data.command ?? '',
      commandArgument: data.CommandArgument ?? data.commandArgument ?? '',
      timeRecorded: data.TimeRecorded ?? data.timeRecorded ?? '',
      reportingNameServer: data.ReportingNameServer ?? data.reportingNameServer ?? '',
      timeToComplete: data.TimeToComplete ?? data.timeToComplete ?? '',
      hasSubscriptions: data.HasSubscriptions ?? data.hasSubscriptions ?? false,
      failed: normalizeEntries(data.Failed ?? data.failed ?? []),
      warnings: normalizeEntries(data.Warnings ?? data.warnings ?? []),
      passed: normalizeEntries(data.Passed ?? data.passed ?? []),
      timeouts: normalizeEntries(data.Timeouts ?? data.timeouts ?? []),
      errors: data.Errors ?? data.errors ?? [],
      information: normalizeEntries(data.Information ?? data.information ?? []),
      isTransitioned: data.IsTransitioned ?? data.isTransitioned ?? false,
      relatedLookups: (data.RelatedLookups ?? data.relatedLookups ?? []).map((r: any) => ({
        name: r.Name ?? r.name ?? '',
        url: r.Url ?? r.url ?? ''
      }))
    };
  }

  async getMonitors(tag?: string): Promise<Monitor[]> {
    let url = '/monitor';
    if (tag) {
      url += `?tag=${encodeURIComponent(tag)}`;
    }
    let response = await this.axios.get(url);
    let data = Array.isArray(response.data) ? response.data : [];
    return data.map(normalizeMonitor);
  }

  async createMonitor(command: string, argument: string): Promise<Monitor> {
    let response = await this.axios.post('/monitor', {
      Command: command,
      CommandArgument: argument
    });
    return normalizeMonitor(response.data);
  }

  async deleteMonitor(monitorUid: string): Promise<void> {
    await this.axios.delete(`/monitor/${encodeURIComponent(monitorUid)}`);
  }

  async getUsage(): Promise<UsageResponse> {
    let response = await this.axios.get('/usage');
    let data = response.data;
    return {
      used: data.Used ?? data.used ?? 0,
      limit: data.Limit ?? data.limit ?? 0
    };
  }
}

let normalizeEntries = (entries: any[]): LookupResultEntry[] => {
  return entries.map((e: any) => ({
    id: e.ID ?? e.Id ?? e.id ?? 0,
    name: e.Name ?? e.name ?? '',
    info: e.Info ?? e.info ?? '',
    url: e.Url ?? e.url ?? ''
  }));
};

let normalizeMonitor = (m: any): Monitor => ({
  monitorUid: m.MonitorUID ?? m.monitorUID ?? m.monitorUid ?? '',
  actionString: m.ActionString ?? m.actionString ?? '',
  lastTransition: m.LastTransition ?? m.lastTransition ?? '',
  lastChecked: m.LastChecked ?? m.lastChecked ?? '',
  mxRep: String(m.MxRep ?? m.mxRep ?? ''),
  failing: m.Failing ?? m.failing ?? [],
  warnings: m.Warnings ?? m.warnings ?? []
});
