import { createAxios } from 'slates';

export interface SmsAlertClientConfig {
  token: string;
}

export class SmsAlertClient {
  private axios: ReturnType<typeof createAxios>;
  private authParams: Record<string, string>;

  constructor(config: SmsAlertClientConfig) {
    this.axios = createAxios({
      baseURL: 'https://www.smsalert.co.in/api/'
    });

    // Support both API key auth and username:password auth
    if (config.token.includes(':')) {
      let [user, pwd] = config.token.split(':');
      this.authParams = { user: user!, pwd: pwd! };
    } else {
      this.authParams = { apikey: config.token };
    }
  }

  // ─── Send SMS ───────────────────────────────────────────────────────

  async sendSms(params: {
    sender: string;
    mobileNo: string;
    text: string;
    route?: string;
    dlrUrl?: string;
    reference?: string;
  }) {
    let response = await this.axios.post('push.json', null, {
      params: {
        ...this.authParams,
        sender: params.sender,
        mobileno: params.mobileNo,
        text: params.text,
        ...(params.route ? { route: params.route } : {}),
        ...(params.dlrUrl ? { dlrurl: params.dlrUrl } : {}),
        ...(params.reference ? { reference: params.reference } : {})
      }
    });
    return response.data;
  }

  async sendSmsToGroup(params: {
    sender: string;
    groupName: string;
    text: string;
    route?: string;
  }) {
    let response = await this.axios.post('push.json', null, {
      params: {
        ...this.authParams,
        sender: params.sender,
        group: params.groupName,
        text: params.text,
        ...(params.route ? { route: params.route } : {})
      }
    });
    return response.data;
  }

  // ─── Schedule SMS ──────────────────────────────────────────────────

  async scheduleSms(params: {
    sender: string;
    mobileNo: string;
    text: string;
    schedule: string;
    route?: string;
  }) {
    let response = await this.axios.post('push.json', null, {
      params: {
        ...this.authParams,
        sender: params.sender,
        mobileno: params.mobileNo,
        text: params.text,
        schedule: params.schedule,
        ...(params.route ? { route: params.route } : {})
      }
    });
    return response.data;
  }

  async editSchedule(params: { scheduledId: string; newSchedule: string }) {
    let response = await this.axios.post('schedule.json', null, {
      params: {
        ...this.authParams,
        scheduleid: params.scheduledId,
        schedule: params.newSchedule
      }
    });
    return response.data;
  }

  async cancelSchedule(params: { scheduledId: string }) {
    let response = await this.axios.post('schedule.json', null, {
      params: {
        ...this.authParams,
        scheduleid: params.scheduledId,
        cancel: 'true'
      }
    });
    return response.data;
  }

  // ─── OTP ───────────────────────────────────────────────────────────

  async generateOtp(params: {
    sender: string;
    mobileNo: string;
    text: string;
    otpLength?: number;
    otpRetry?: number;
    otpValidity?: number;
    route?: string;
  }) {
    let response = await this.axios.post('otp.json', null, {
      params: {
        ...this.authParams,
        sender: params.sender,
        mobileno: params.mobileNo,
        text: params.text,
        ...(params.otpLength ? { otp_length: params.otpLength } : {}),
        ...(params.otpRetry ? { otp_retry: params.otpRetry } : {}),
        ...(params.otpValidity ? { otp_validity: params.otpValidity } : {}),
        ...(params.route ? { route: params.route } : {})
      }
    });
    return response.data;
  }

  async validateOtp(params: { mobileNo: string; otp: string }) {
    let response = await this.axios.post('otp.json', null, {
      params: {
        ...this.authParams,
        mobileno: params.mobileNo,
        otp: params.otp,
        verify: 'true'
      }
    });
    return response.data;
  }

  // ─── Contacts ──────────────────────────────────────────────────────

  async listContacts(params?: { groupName?: string }) {
    let response = await this.axios.get('contactlist.json', {
      params: {
        ...this.authParams,
        ...(params?.groupName ? { grp_name: params.groupName } : {})
      }
    });
    return response.data;
  }

  async createContact(params: { groupName: string; name: string; mobileNo: string }) {
    let response = await this.axios.post('contact.json', null, {
      params: {
        ...this.authParams,
        grp_name: params.groupName,
        name: params.name,
        mobileno: params.mobileNo
      }
    });
    return response.data;
  }

  async editContact(params: {
    groupName: string;
    oldMobileNo: string;
    newMobileNo?: string;
    name?: string;
  }) {
    let response = await this.axios.post('contact.json', null, {
      params: {
        ...this.authParams,
        grp_name: params.groupName,
        old_mobileno: params.oldMobileNo,
        ...(params.newMobileNo ? { mobileno: params.newMobileNo } : {}),
        ...(params.name ? { name: params.name } : {}),
        edit: 'true'
      }
    });
    return response.data;
  }

  async deleteContact(params: { groupName: string; mobileNo: string }) {
    let response = await this.axios.post('contact.json', null, {
      params: {
        ...this.authParams,
        grp_name: params.groupName,
        mobileno: params.mobileNo,
        delete: 'true'
      }
    });
    return response.data;
  }

  // ─── Groups ────────────────────────────────────────────────────────

  async listGroups() {
    let response = await this.axios.get('grouplist.json', {
      params: {
        ...this.authParams
      }
    });
    return response.data;
  }

  async createGroup(params: { groupName: string }) {
    let response = await this.axios.post('group.json', null, {
      params: {
        ...this.authParams,
        grp_name: params.groupName
      }
    });
    return response.data;
  }

  async editGroup(params: { oldGroupName: string; newGroupName: string }) {
    let response = await this.axios.post('group.json', null, {
      params: {
        ...this.authParams,
        old_grp_name: params.oldGroupName,
        grp_name: params.newGroupName,
        edit: 'true'
      }
    });
    return response.data;
  }

  async deleteGroup(params: { groupName: string }) {
    let response = await this.axios.post('group.json', null, {
      params: {
        ...this.authParams,
        grp_name: params.groupName,
        delete: 'true'
      }
    });
    return response.data;
  }

  // ─── Templates ─────────────────────────────────────────────────────

  async listTemplates() {
    let response = await this.axios.get('templatelist.json', {
      params: {
        ...this.authParams
      }
    });
    return response.data;
  }

  async createTemplate(params: { templateName: string; templateBody: string }) {
    let response = await this.axios.post('template.json', null, {
      params: {
        ...this.authParams,
        template_name: params.templateName,
        template_body: params.templateBody
      }
    });
    return response.data;
  }

  async editTemplate(params: {
    templateId: string;
    templateName?: string;
    templateBody?: string;
  }) {
    let response = await this.axios.post('template.json', null, {
      params: {
        ...this.authParams,
        template_id: params.templateId,
        ...(params.templateName ? { template_name: params.templateName } : {}),
        ...(params.templateBody ? { template_body: params.templateBody } : {}),
        edit: 'true'
      }
    });
    return response.data;
  }

  async deleteTemplate(params: { templateId: string }) {
    let response = await this.axios.post('template.json', null, {
      params: {
        ...this.authParams,
        template_id: params.templateId,
        delete: 'true'
      }
    });
    return response.data;
  }

  // ─── Sender IDs ────────────────────────────────────────────────────

  async listSenderIds() {
    let response = await this.axios.get('senderidlist.json', {
      params: {
        ...this.authParams
      }
    });
    return response.data;
  }

  // ─── Reports ───────────────────────────────────────────────────────

  async getSmsReport(params?: {
    fromDate?: string;
    toDate?: string;
    mobileNo?: string;
    sender?: string;
  }) {
    let response = await this.axios.post('msgreport.json', null, {
      params: {
        ...this.authParams,
        ...(params?.fromDate ? { fromdate: params.fromDate } : {}),
        ...(params?.toDate ? { todate: params.toDate } : {}),
        ...(params?.mobileNo ? { mobileno: params.mobileNo } : {}),
        ...(params?.sender ? { sender: params.sender } : {})
      }
    });
    return response.data;
  }

  async getDeliveryReport(params: { batchId: string }) {
    let response = await this.axios.post('pullreport.json', null, {
      params: {
        ...this.authParams,
        id: params.batchId
      }
    });
    return response.data;
  }

  // ─── Credit Balance ────────────────────────────────────────────────

  async getCreditBalance() {
    let response = await this.axios.get('creditstatus.json', {
      params: {
        ...this.authParams
      }
    });
    return response.data;
  }

  // ─── Short URL ─────────────────────────────────────────────────────

  async createShortUrl(params: { longUrl: string }) {
    let response = await this.axios.post('shorturl.json', null, {
      params: {
        ...this.authParams,
        url: params.longUrl
      }
    });
    return response.data;
  }

  async deleteShortUrl(params: { shortUrlId: string }) {
    let response = await this.axios.post('shorturl.json', null, {
      params: {
        ...this.authParams,
        id: params.shortUrlId,
        delete: 'true'
      }
    });
    return response.data;
  }

  // ─── Account ───────────────────────────────────────────────────────

  async getProfile() {
    let response = await this.axios.post('user.json', null, {
      params: {
        ...this.authParams
      }
    });
    return response.data;
  }
}
