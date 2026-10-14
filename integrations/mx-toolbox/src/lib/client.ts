import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

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
  isEndpoint: boolean;
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

export interface MonitorTag {
  uid: string;
  name: string;
  isHidden: boolean;
  isNegative: boolean;
  monitorCount: number;
}

export interface Monitor {
  monitorUid: string;
  actionString: string;
  lastTransition: string;
  lastChecked: string;
  mxRep: string;
  failing: string[];
  warnings: string[];
  failingDetails: LookupResultEntry[];
  warningDetails: LookupResultEntry[];
  name: string;
  historyUrl: string;
  timeElapsed: string;
  recordCount: string;
  lastResultUid: string;
  tags: MonitorTag[];
}

export interface UsageResponse {
  used: number;
  limit: number;
  dnsRequests?: number;
  dnsMax?: number;
  networkRequests?: number;
  networkMax?: number;
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(token: string) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.mxtoolbox.com/api/v1',
      timeout: 30_000,
      authHeader: { value: requireText(token, 'MXToolbox API key') },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'MXToolbox',
          reason: 'mxtoolbox_api_request_failed'
        })
    });
  }

  async lookup(command: string, argument: string, port?: string): Promise<LookupResponse> {
    command = requireText(command, 'Lookup command');
    if (command === 'aa') command = 'aaaa';
    argument = requireText(argument, 'Lookup hostname');
    if (command === 'dkim' && !/^[^:\s]+:[^:\s]+$/.test(argument)) {
      throw createApiServiceError(
        'DKIM lookups require a domain and selector, such as example.com:default.'
      );
    }
    if (command === 'tcp' && !port) {
      throw createApiServiceError('TCP lookups require a port.');
    }
    if (
      port !== undefined &&
      (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535)
    ) {
      throw createApiServiceError('Port must be a whole number from 1 to 65535.');
    }
    let response = await this.axios.get(`/Lookup/${encodeURIComponent(command)}/`, {
      params: { argument, port }
    });
    let data = asRecord(response.data);
    return {
      uid: textValue(data.UID ?? data.uid),
      command: textValue(data.Command ?? data.command),
      commandArgument: textValue(data.CommandArgument ?? data.commandArgument),
      timeRecorded: textValue(data.TimeRecorded ?? data.timeRecorded),
      reportingNameServer: textValue(data.ReportingNameServer ?? data.reportingNameServer),
      timeToComplete: textValue(data.TimeToComplete ?? data.timeToComplete),
      isEndpoint: data.IsEndpoint === true || data.isEndpoint === true,
      hasSubscriptions: data.HasSubscriptions === true || data.hasSubscriptions === true,
      failed: normalizeEntries(data.Failed ?? data.failed),
      warnings: normalizeEntries(data.Warnings ?? data.warnings),
      passed: normalizeEntries(data.Passed ?? data.passed),
      timeouts: normalizeEntries(data.Timeouts ?? data.timeouts),
      errors: normalizeMessages(data.Errors ?? data.errors),
      information: normalizeEntries(data.Information ?? data.information),
      isTransitioned: data.IsTransitioned === true || data.isTransitioned === true,
      relatedLookups: asArray(data.RelatedLookups ?? data.relatedLookups).map(value => {
        let related = asRecord(value);
        return {
          name: textValue(related.Name ?? related.name),
          url: textValue(related.Url ?? related.url)
        };
      })
    };
  }

  async getMonitors(tag?: string, command?: string, name?: string): Promise<Monitor[]> {
    let response = await this.axios.get('/Monitor', {
      params: {
        tag: tag === undefined ? undefined : requireText(tag, 'Monitor tag'),
        command: command === undefined ? undefined : requireText(command, 'Monitor command'),
        name: name === undefined ? undefined : requireText(name, 'Monitor name')
      }
    });
    return asArray(response.data, false).map(normalizeMonitor);
  }

  async getMonitor(monitorUid: string): Promise<Monitor | null> {
    let response = await this.axios.get(
      `/Monitor/${encodeURIComponent(requireText(monitorUid, 'Monitor UID'))}`
    );
    let monitors = asArray(response.data, false).map(normalizeMonitor);
    return (
      monitors.find(
        monitor => monitor.monitorUid.toLowerCase() === monitorUid.trim().toLowerCase()
      ) ?? null
    );
  }

  async getMonitorTags(monitorUid: string): Promise<MonitorTag[]> {
    let response = await this.axios.get(
      `/Monitor/${encodeURIComponent(requireText(monitorUid, 'Monitor UID'))}/Tag`
    );
    return asArray(response.data, false).map(normalizeTag);
  }

  async createMonitor(command: string, argument: string): Promise<Monitor> {
    let response = await this.axios.post('/monitor', {
      Command: requireText(command, 'Monitor command'),
      CommandArgument: requireText(argument, 'Monitor target')
    });
    return normalizeMonitor(Array.isArray(response.data) ? response.data[0] : response.data);
  }

  async deleteMonitor(monitorUid: string): Promise<void> {
    await this.axios.delete(
      `/monitor/${encodeURIComponent(requireText(monitorUid, 'Monitor UID'))}`
    );
  }

  async getUsage(): Promise<UsageResponse> {
    let response = await this.axios.get('/Usage');
    let data = asRecord(response.data);
    let dnsRequests = numberValue(data.DnsRequests ?? data.dnsRequests);
    let dnsMax = numberValue(data.DnsMax ?? data.dnsMax);
    let networkRequests = numberValue(data.NetworkRequests ?? data.networkRequests);
    let networkMax = numberValue(data.NetworkMax ?? data.networkMax);
    if (
      dnsRequests !== undefined &&
      dnsMax !== undefined &&
      networkRequests !== undefined &&
      networkMax !== undefined
    ) {
      return {
        used: dnsRequests + networkRequests,
        limit: dnsMax + networkMax,
        dnsRequests,
        dnsMax,
        networkRequests,
        networkMax
      };
    }
    let used = numberValue(data.Used ?? data.used);
    let limit = numberValue(data.Limit ?? data.limit);
    if (used !== undefined && limit !== undefined) return { used, limit };
    throw createApiServiceError('MXToolbox returned an incomplete API usage response.', {
      reason: 'mxtoolbox_invalid_response'
    });
  }
}

let requireText = (value: string, label: string) => {
  let trimmed = value.trim();
  if (!trimmed) throw createApiServiceError(`${label} must not be empty.`);
  return trimmed;
};

let asRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw createApiServiceError('MXToolbox returned an invalid response object.', {
      reason: 'mxtoolbox_invalid_response'
    });
  }
  return value as Record<string, unknown>;
};

let asArray = (value: unknown, optional = true): unknown[] => {
  if (optional && (value === undefined || value === null)) return [];
  if (!Array.isArray(value)) {
    throw createApiServiceError('MXToolbox returned an invalid response list.', {
      reason: 'mxtoolbox_invalid_response'
    });
  }
  return value;
};

let textValue = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';

let numberValue = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined;
  let number =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(number) || number < 0) {
    throw createApiServiceError('MXToolbox returned an invalid numeric value.', {
      reason: 'mxtoolbox_invalid_response'
    });
  }
  return number;
};

let normalizeEntries = (entries: unknown): LookupResultEntry[] =>
  asArray(entries).map(value => {
    if (typeof value === 'string') return { id: 0, name: value, info: '', url: '' };
    let entry = asRecord(value);
    return {
      id: numberValue(entry.ID ?? entry.Id ?? entry.id) ?? 0,
      name: textValue(entry.Name ?? entry.name),
      info: textValue(entry.Info ?? entry.info),
      url: textValue(entry.Url ?? entry.url)
    };
  });

let normalizeMessages = (value: unknown): string[] =>
  normalizeEntries(value).map(entry => [entry.name, entry.info].filter(Boolean).join(': '));

let normalizeTag = (value: unknown): MonitorTag => {
  let tag = asRecord(value);
  return {
    uid: textValue(tag.UID ?? tag.uid),
    name: textValue(tag.Name ?? tag.name),
    isHidden: tag.IsHidden === true || tag.isHidden === true,
    isNegative: tag.IsNegative === true || tag.isNegative === true,
    monitorCount: numberValue(tag.MonitorCount ?? tag.monitorCount) ?? 0
  };
};

let normalizeMonitor = (value: unknown): Monitor => {
  let monitor = asRecord(value);
  let monitorUid = textValue(monitor.MonitorUID ?? monitor.monitorUID ?? monitor.monitorUid);
  if (!monitorUid) {
    throw createApiServiceError('MXToolbox returned a monitor without its UID.', {
      reason: 'mxtoolbox_invalid_response'
    });
  }
  return {
    monitorUid,
    actionString: textValue(monitor.ActionString ?? monitor.actionString),
    lastTransition: textValue(monitor.LastTransition ?? monitor.lastTransition),
    lastChecked: textValue(monitor.LastChecked ?? monitor.lastChecked),
    mxRep: textValue(monitor.MxRep ?? monitor.mxRep),
    failing: normalizeMessages(monitor.Failing ?? monitor.failing),
    warnings: normalizeMessages(monitor.Warnings ?? monitor.warnings),
    failingDetails: normalizeEntries(monitor.Failing ?? monitor.failing),
    warningDetails: normalizeEntries(monitor.Warnings ?? monitor.warnings),
    name: textValue(monitor.Name ?? monitor.name),
    historyUrl: textValue(monitor.HistoryUrl ?? monitor.historyUrl),
    timeElapsed: textValue(monitor.TimeElapsed ?? monitor.timeElapsed),
    recordCount: textValue(monitor.RecordCount ?? monitor.recordCount),
    lastResultUid: textValue(monitor.LarUID ?? monitor.lastResultUid),
    tags: asArray(monitor.Tags ?? monitor.tags).map(normalizeTag)
  };
};
