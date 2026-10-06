import { BetterStackApi, type ClientOptions, type PageOptions, pathId } from './api';

export type { PaginatedResponse } from './api';

export class UptimeClient extends BetterStackApi {
  constructor(options: ClientOptions) {
    super(options, 'uptime');
  }
  listMonitors(
    params?: PageOptions & {
      pronounceableName?: string;
      url?: string;
    }
  ) {
    return this.page('/v2/monitors', params, {
      pronounceable_name: params?.pronounceableName,
      url: params?.url
    });
  }
  getMonitor(id: string) {
    return this.get(`/v2/monitors/${pathId(id)}`);
  }
  createMonitor(body: Record<string, unknown>) {
    return this.post('/v2/monitors', body);
  }
  updateMonitor(id: string, body: Record<string, unknown>) {
    return this.patch(`/v2/monitors/${pathId(id)}`, body);
  }
  deleteMonitor(id: string) {
    return this.remove(`/v2/monitors/${pathId(id)}`);
  }
  listHeartbeats(params?: PageOptions) {
    return this.page('/v2/heartbeats', params);
  }
  getHeartbeat(id: string) {
    return this.get(`/v2/heartbeats/${pathId(id)}`);
  }
  createHeartbeat(body: Record<string, unknown>) {
    return this.post('/v2/heartbeats', body);
  }
  updateHeartbeat(id: string, body: Record<string, unknown>) {
    return this.patch(`/v2/heartbeats/${pathId(id)}`, body);
  }
  deleteHeartbeat(id: string) {
    return this.remove(`/v2/heartbeats/${pathId(id)}`);
  }
  listIncidents(
    params?: PageOptions & {
      from?: string;
      to?: string;
      monitorId?: string;
      heartbeatId?: string;
      resolved?: boolean;
      acknowledged?: boolean;
    }
  ) {
    return this.page(
      '/v3/incidents',
      params,
      {
        from: params?.from,
        to: params?.to,
        monitor_id: params?.monitorId,
        heartbeat_id: params?.heartbeatId,
        resolved: params?.resolved,
        acknowledged: params?.acknowledged
      },
      50
    );
  }
  getIncident(id: string) {
    return this.get(`/v3/incidents/${pathId(id)}`);
  }
  createIncident(body: Record<string, unknown>) {
    return this.post('/v3/incidents', body);
  }
  acknowledgeIncident(id: string, acknowledgedBy?: string) {
    return this.post(
      `/v3/incidents/${pathId(id)}/acknowledge`,
      { acknowledged_by: acknowledgedBy },
      false
    );
  }
  resolveIncident(id: string, resolvedBy?: string) {
    return this.post(
      `/v3/incidents/${pathId(id)}/resolve`,
      { resolved_by: resolvedBy },
      false
    );
  }
  deleteIncident(id: string) {
    return this.remove(`/v3/incidents/${pathId(id)}`);
  }
  getIncidentTimeline(id: string) {
    return this.page(`/v3/incidents/${pathId(id)}/timeline`);
  }
  listStatusPages(params?: PageOptions) {
    return this.page('/v2/status-pages', params);
  }
  getStatusPage(id: string) {
    return this.get(`/v2/status-pages/${pathId(id)}`);
  }
  createStatusPage(body: Record<string, unknown>) {
    return this.post('/v2/status-pages', body);
  }
  updateStatusPage(id: string, body: Record<string, unknown>) {
    return this.patch(`/v2/status-pages/${pathId(id)}`, body);
  }
  deleteStatusPage(id: string) {
    return this.remove(`/v2/status-pages/${pathId(id)}`);
  }
  listOnCallCalendars(params?: PageOptions) {
    return this.page('/v2/on-calls', params);
  }
  getOnCallCalendar(id: string) {
    return this.get(`/v2/on-calls/${pathId(id)}`);
  }
  createOnCallCalendar(body: Record<string, unknown>) {
    return this.post('/v2/on-calls', body);
  }
  updateOnCallCalendar(id: string, body: Record<string, unknown>) {
    return this.patch(`/v2/on-calls/${pathId(id)}`, body);
  }
  deleteOnCallCalendar(id: string) {
    return this.remove(`/v2/on-calls/${pathId(id)}`);
  }
  listEscalationPolicies(params?: PageOptions) {
    return this.page('/v3/policies', params);
  }
  getEscalationPolicy(id: string) {
    return this.get(`/v3/policies/${pathId(id)}`);
  }
  createEscalationPolicy(body: Record<string, unknown>) {
    return this.post('/v3/policies', body);
  }
  updateEscalationPolicy(id: string, body: Record<string, unknown>) {
    return this.patch(`/v3/policies/${pathId(id)}`, body);
  }
  deleteEscalationPolicy(id: string) {
    return this.remove(`/v3/policies/${pathId(id)}`);
  }
  listIncomingWebhooks(params?: PageOptions) {
    return this.page('/v2/incoming-webhooks', params);
  }
  getIncomingWebhook(id: string) {
    return this.get(`/v2/incoming-webhooks/${pathId(id)}`);
  }
  createIncomingWebhook(body: Record<string, unknown>) {
    return this.post('/v2/incoming-webhooks', body);
  }
  updateIncomingWebhook(id: string, body: Record<string, unknown>) {
    return this.patch(`/v2/incoming-webhooks/${pathId(id)}`, body);
  }
  deleteIncomingWebhook(id: string) {
    return this.remove(`/v2/incoming-webhooks/${pathId(id)}`);
  }
}
