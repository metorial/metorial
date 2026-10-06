import { createApiServiceError } from 'slates';
import { BetterStackApi, type ClientOptions, type PageOptions, pathId } from './api';

export type AlertContext = { dashboardId?: string; chartId?: string; explorationId?: string };
export class TelemetryClient extends BetterStackApi {
  constructor(options: ClientOptions) {
    super(options, 'telemetry');
  }
  listSources(params?: PageOptions) {
    return this.page('/v2/sources', params, undefined, 50);
  }
  getSource(id: string) {
    return this.get(`/v2/sources/${pathId(id)}`);
  }
  createSource(body: Record<string, unknown>) {
    return this.post('/v2/sources', body);
  }
  updateSource(id: string, body: Record<string, unknown>) {
    return this.patch(`/v2/sources/${pathId(id)}`, body);
  }
  deleteSource(id: string) {
    return this.remove(`/v2/sources/${pathId(id)}`);
  }
  listDashboards(params?: PageOptions & { query?: string }) {
    return this.page('/v2/dashboards', params, { query: params?.query });
  }
  getDashboard(id: string) {
    return this.get(`/v2/dashboards/${pathId(id)}`);
  }
  listAlerts(params?: PageOptions) {
    return this.page('/v2/alerts', params);
  }
  private alertPath(context: AlertContext) {
    if (context.explorationId && !context.dashboardId && !context.chartId)
      return `/v2/explorations/${pathId(context.explorationId)}/alerts`;
    if (context.dashboardId && context.chartId && !context.explorationId)
      return `/v2/dashboards/${pathId(context.dashboardId)}/charts/${pathId(context.chartId)}/alerts`;
    throw createApiServiceError(
      'Provide explorationId, or both dashboardId and chartId. Call list_dashboards for dashboard and chart identifiers.'
    );
  }
  getAlert(id: string) {
    return this.get(`/v2/alerts/${pathId(id)}`);
  }
  createAlert(body: Record<string, unknown>, context: AlertContext) {
    return this.post(this.alertPath(context), body, false);
  }
  updateAlert(id: string, body: Record<string, unknown>) {
    return this.patch(`/v2/alerts/${pathId(id)}`, body);
  }
  deleteAlert(id: string) {
    return this.remove(`/v2/alerts/${pathId(id)}`);
  }
}
