import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(private config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.uptimerobot.com/v2'
    });
  }

  private async post(endpoint: string, params: Record<string, any> = {}) {
    let response = await this.axios.post(endpoint, {
      api_key: this.config.token,
      format: 'json',
      ...params
    });

    let data = response.data;

    if (data.stat === 'fail') {
      let err = data.error;
      throw new Error(`UptimeRobot API error: ${err.message || err.type} (${err.type})`);
    }

    return data;
  }

  // ==================== Account ====================

  async getAccountDetails() {
    let data = await this.post('/getAccountDetails');
    return data.account;
  }

  // ==================== Monitors ====================

  async getMonitors(
    params: {
      monitors?: string;
      types?: string;
      statuses?: string;
      search?: string;
      customUptimeRatios?: string;
      allTimeUptimeRatio?: number;
      logs?: number;
      logsLimit?: number;
      responseTimes?: number;
      responseTimesLimit?: number;
      alertContacts?: number;
      ssl?: number;
      offset?: number;
      limit?: number;
    } = {}
  ) {
    let data = await this.post('/getMonitors', {
      ...(params.monitors && { monitors: params.monitors }),
      ...(params.types && { types: params.types }),
      ...(params.statuses && { statuses: params.statuses }),
      ...(params.search && { search: params.search }),
      ...(params.customUptimeRatios && { custom_uptime_ratios: params.customUptimeRatios }),
      ...(params.allTimeUptimeRatio !== undefined && {
        all_time_uptime_ratio: params.allTimeUptimeRatio
      }),
      ...(params.logs !== undefined && { logs: params.logs }),
      ...(params.logsLimit !== undefined && { logs_limit: params.logsLimit }),
      ...(params.responseTimes !== undefined && { response_times: params.responseTimes }),
      ...(params.responseTimesLimit !== undefined && {
        response_times_limit: params.responseTimesLimit
      }),
      ...(params.alertContacts !== undefined && { alert_contacts: params.alertContacts }),
      ...(params.ssl !== undefined && { ssl: params.ssl }),
      ...(params.offset !== undefined && { offset: params.offset }),
      ...(params.limit !== undefined && { limit: params.limit })
    });

    return {
      monitors: data.monitors || [],
      pagination: data.pagination
    };
  }

  async newMonitor(params: {
    friendlyName: string;
    url: string;
    type: number;
    subType?: number;
    port?: number;
    keywordType?: number;
    keywordCaseType?: number;
    keywordValue?: string;
    interval?: number;
    timeout?: number;
    httpUsername?: string;
    httpPassword?: string;
    httpAuthType?: number;
    httpMethod?: number;
    postType?: number;
    postValue?: string;
    postContentType?: number;
    alertContacts?: string;
    mwindows?: string;
    customHttpHeaders?: string;
    customHttpStatuses?: string;
    ignoreSslErrors?: number;
    disableDomainExpireNotifications?: number;
  }) {
    let data = await this.post('/newMonitor', {
      friendly_name: params.friendlyName,
      url: params.url,
      type: params.type,
      ...(params.subType !== undefined && { sub_type: params.subType }),
      ...(params.port !== undefined && { port: params.port }),
      ...(params.keywordType !== undefined && { keyword_type: params.keywordType }),
      ...(params.keywordCaseType !== undefined && {
        keyword_case_type: params.keywordCaseType
      }),
      ...(params.keywordValue !== undefined && { keyword_value: params.keywordValue }),
      ...(params.interval !== undefined && { interval: params.interval }),
      ...(params.timeout !== undefined && { timeout: params.timeout }),
      ...(params.httpUsername !== undefined && { http_username: params.httpUsername }),
      ...(params.httpPassword !== undefined && { http_password: params.httpPassword }),
      ...(params.httpAuthType !== undefined && { http_auth_type: params.httpAuthType }),
      ...(params.httpMethod !== undefined && { http_method: params.httpMethod }),
      ...(params.postType !== undefined && { post_type: params.postType }),
      ...(params.postValue !== undefined && { post_value: params.postValue }),
      ...(params.postContentType !== undefined && {
        post_content_type: params.postContentType
      }),
      ...(params.alertContacts && { alert_contacts: params.alertContacts }),
      ...(params.mwindows && { mwindows: params.mwindows }),
      ...(params.customHttpHeaders && { custom_http_headers: params.customHttpHeaders }),
      ...(params.customHttpStatuses && { custom_http_statuses: params.customHttpStatuses }),
      ...(params.ignoreSslErrors !== undefined && {
        ignore_ssl_errors: params.ignoreSslErrors
      }),
      ...(params.disableDomainExpireNotifications !== undefined && {
        disable_domain_expire_notifications: params.disableDomainExpireNotifications
      })
    });

    return data.monitor;
  }

  async editMonitor(params: {
    monitorId: number;
    friendlyName?: string;
    url?: string;
    subType?: number;
    port?: number;
    keywordType?: number;
    keywordCaseType?: number;
    keywordValue?: string;
    interval?: number;
    timeout?: number;
    status?: number;
    httpUsername?: string;
    httpPassword?: string;
    httpAuthType?: number;
    httpMethod?: number;
    postType?: number;
    postValue?: string;
    postContentType?: number;
    alertContacts?: string;
    mwindows?: string;
    customHttpHeaders?: string;
    customHttpStatuses?: string;
    ignoreSslErrors?: number;
    disableDomainExpireNotifications?: number;
  }) {
    let data = await this.post('/editMonitor', {
      id: params.monitorId,
      ...(params.friendlyName !== undefined && { friendly_name: params.friendlyName }),
      ...(params.url !== undefined && { url: params.url }),
      ...(params.subType !== undefined && { sub_type: params.subType }),
      ...(params.port !== undefined && { port: params.port }),
      ...(params.keywordType !== undefined && { keyword_type: params.keywordType }),
      ...(params.keywordCaseType !== undefined && {
        keyword_case_type: params.keywordCaseType
      }),
      ...(params.keywordValue !== undefined && { keyword_value: params.keywordValue }),
      ...(params.interval !== undefined && { interval: params.interval }),
      ...(params.timeout !== undefined && { timeout: params.timeout }),
      ...(params.status !== undefined && { status: params.status }),
      ...(params.httpUsername !== undefined && { http_username: params.httpUsername }),
      ...(params.httpPassword !== undefined && { http_password: params.httpPassword }),
      ...(params.httpAuthType !== undefined && { http_auth_type: params.httpAuthType }),
      ...(params.httpMethod !== undefined && { http_method: params.httpMethod }),
      ...(params.postType !== undefined && { post_type: params.postType }),
      ...(params.postValue !== undefined && { post_value: params.postValue }),
      ...(params.postContentType !== undefined && {
        post_content_type: params.postContentType
      }),
      ...(params.alertContacts !== undefined && { alert_contacts: params.alertContacts }),
      ...(params.mwindows !== undefined && { mwindows: params.mwindows }),
      ...(params.customHttpHeaders !== undefined && {
        custom_http_headers: params.customHttpHeaders
      }),
      ...(params.customHttpStatuses !== undefined && {
        custom_http_statuses: params.customHttpStatuses
      }),
      ...(params.ignoreSslErrors !== undefined && {
        ignore_ssl_errors: params.ignoreSslErrors
      }),
      ...(params.disableDomainExpireNotifications !== undefined && {
        disable_domain_expire_notifications: params.disableDomainExpireNotifications
      })
    });

    return data.monitor;
  }

  async deleteMonitor(monitorId: number) {
    let data = await this.post('/deleteMonitor', { id: monitorId });
    return data.monitor;
  }

  // ==================== Alert Contacts ====================

  async getAlertContacts(
    params: { alertContacts?: string; offset?: number; limit?: number } = {}
  ) {
    let data = await this.post('/getAlertContacts', {
      ...(params.alertContacts && { alert_contacts: params.alertContacts }),
      ...(params.offset !== undefined && { offset: params.offset }),
      ...(params.limit !== undefined && { limit: params.limit })
    });

    return {
      alertContacts: data.alert_contacts || [],
      total: data.total,
      offset: data.offset,
      limit: data.limit
    };
  }

  async newAlertContact(params: { type: number; friendlyName?: string; value: string }) {
    let data = await this.post('/newAlertContact', {
      type: params.type,
      value: params.value,
      ...(params.friendlyName !== undefined && { friendly_name: params.friendlyName })
    });

    return data.alertcontact;
  }

  async editAlertContact(params: {
    contactId: string;
    friendlyName?: string;
    value?: string;
  }) {
    let data = await this.post('/editAlertContact', {
      id: params.contactId,
      ...(params.friendlyName !== undefined && { friendly_name: params.friendlyName }),
      ...(params.value !== undefined && { value: params.value })
    });

    return data.alertcontact;
  }

  async deleteAlertContact(contactId: string) {
    let data = await this.post('/deleteAlertContact', { id: contactId });
    return data.alertcontact;
  }

  // ==================== Public Status Pages ====================

  async getPSPs(params: { psps?: string; offset?: number; limit?: number } = {}) {
    let data = await this.post('/getPSPs', {
      ...(params.psps && { psps: params.psps }),
      ...(params.offset !== undefined && { offset: params.offset }),
      ...(params.limit !== undefined && { limit: params.limit })
    });

    return {
      statusPages: data.psps || [],
      pagination: data.pagination
    };
  }

  async newPSP(params: {
    friendlyName: string;
    type: number;
    monitors: string;
    sort?: number;
    customDomain?: string;
    password?: string;
    hideUrlLinks?: number;
    status?: number;
  }) {
    let data = await this.post('/newPSP', {
      friendly_name: params.friendlyName,
      type: params.type,
      monitors: params.monitors,
      ...(params.sort !== undefined && { sort: params.sort }),
      ...(params.customDomain !== undefined && { custom_domain: params.customDomain }),
      ...(params.password !== undefined && { password: params.password }),
      ...(params.hideUrlLinks !== undefined && { hide_url_links: params.hideUrlLinks }),
      ...(params.status !== undefined && { status: params.status })
    });

    return data.psp;
  }

  async editPSP(params: {
    pspId: number;
    friendlyName?: string;
    monitors?: string;
    sort?: number;
    customDomain?: string;
    password?: string;
    hideUrlLinks?: number;
    status?: number;
  }) {
    let data = await this.post('/editPSP', {
      id: params.pspId,
      ...(params.friendlyName !== undefined && { friendly_name: params.friendlyName }),
      ...(params.monitors !== undefined && { monitors: params.monitors }),
      ...(params.sort !== undefined && { sort: params.sort }),
      ...(params.customDomain !== undefined && { custom_domain: params.customDomain }),
      ...(params.password !== undefined && { password: params.password }),
      ...(params.hideUrlLinks !== undefined && { hide_url_links: params.hideUrlLinks }),
      ...(params.status !== undefined && { status: params.status })
    });

    return data.psp;
  }

  async deletePSP(pspId: number) {
    let data = await this.post('/deletePSP', { id: pspId });
    return data.psp;
  }

  // ==================== Maintenance Windows ====================

  async getMWindows(params: { mwindows?: string; offset?: number; limit?: number } = {}) {
    let data = await this.post('/getMWindows', {
      ...(params.mwindows && { mwindows: params.mwindows }),
      ...(params.offset !== undefined && { offset: params.offset }),
      ...(params.limit !== undefined && { limit: params.limit })
    });

    return {
      maintenanceWindows: data.mwindows || [],
      pagination: data.pagination
    };
  }

  async newMWindow(params: {
    friendlyName: string;
    type: number;
    startTime: string | number;
    duration: number;
    value: string;
  }) {
    let data = await this.post('/newMWindow', {
      friendly_name: params.friendlyName,
      type: params.type,
      start_time: params.startTime,
      duration: params.duration,
      value: params.value
    });

    return data.mwindow;
  }

  async editMWindow(params: {
    mwindowId: number;
    friendlyName?: string;
    startTime?: string | number;
    duration?: number;
    value?: string;
  }) {
    let data = await this.post('/editMWindow', {
      id: params.mwindowId,
      ...(params.friendlyName !== undefined && { friendly_name: params.friendlyName }),
      ...(params.startTime !== undefined && { start_time: params.startTime }),
      ...(params.duration !== undefined && { duration: params.duration }),
      ...(params.value !== undefined && { value: params.value })
    });

    return data.mwindow;
  }

  async deleteMWindow(mwindowId: number) {
    let data = await this.post('/deleteMWindow', { id: mwindowId });
    return data.mwindow;
  }
}
