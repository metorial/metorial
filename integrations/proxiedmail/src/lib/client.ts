import { createAxios } from 'slates';

export interface ProxyBinding {
  proxyBindingId: string;
  proxyAddress: string;
  realAddresses: Record<
    string,
    {
      isEnabled: boolean;
      isVerificationNeeded: boolean;
      isVerified: boolean;
    }
  >;
  isBrowsable: boolean;
  receivedEmailsCount: number;
  description: string | null;
  callbackUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProxyBindingListMeta {
  usedProxyBindings: number;
  availableProxyBindings: number;
}

export interface ReceivedEmailLink {
  receivedEmailId: string;
  recipientEmail: string;
  senderEmail: string;
  subject: string;
  attachmentsCount: number;
  isProcessed: boolean;
  createdAt: string;
}

export interface ReceivedEmailDetail {
  receivedEmailId: string;
  recipientEmail: string;
  senderEmail: string;
  subject: string;
  bodyHtml: string | null;
  bodyPlain: string | null;
  from: string | null;
  to: string | null;
  attachments: Array<{ url: string }>;
  isProcessed: boolean;
  createdAt: string;
}

export interface WebhookReceiver {
  receiverId: string;
  callUrl: string;
  getUrl: string;
}

export interface WebhookReceiverStatus {
  status: string;
  payload: any;
  isReceived: boolean;
  method: string | null;
}

export interface CreateProxyEmailParams {
  realAddresses?: string[];
  proxyAddress?: string | null;
  isBrowsable?: boolean;
  callbackUrl?: string | null;
}

export interface UpdateProxyEmailParams {
  realAddresses?: string[];
  callbackUrl?: string | null;
  description?: string | null;
  isBrowsable?: boolean;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://proxiedmail.com/api/v1',
      headers: {
        Token: config.token,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  async listProxyEmails(): Promise<{ bindings: ProxyBinding[]; meta: ProxyBindingListMeta }> {
    let response = await this.axios.get('/proxy-bindings');
    let data = response.data;

    let bindings: ProxyBinding[] = (data.data || []).map((item: any) => mapProxyBinding(item));

    return {
      bindings,
      meta: {
        usedProxyBindings: data.meta?.usedProxyBindings ?? 0,
        availableProxyBindings: data.meta?.availableProxyBindings ?? 0
      }
    };
  }

  async createProxyEmail(params: CreateProxyEmailParams): Promise<ProxyBinding> {
    let attributes: Record<string, any> = {};

    if (params.realAddresses !== undefined) {
      attributes.real_addresses = params.realAddresses;
    } else {
      attributes.real_addresses = [];
    }

    attributes.proxy_address = params.proxyAddress ?? null;
    attributes.is_browsable = params.isBrowsable ?? false;

    if (params.callbackUrl !== undefined) {
      attributes.callback_url = params.callbackUrl;
    }

    let response = await this.axios.post('/proxy-bindings', {
      data: {
        type: 'proxy_bindings',
        attributes
      }
    });

    return mapProxyBinding(response.data.data);
  }

  async updateProxyEmail(
    proxyBindingId: string,
    params: UpdateProxyEmailParams
  ): Promise<ProxyBinding> {
    let attributes: Record<string, any> = {};

    if (params.realAddresses !== undefined) {
      attributes.real_addresses = params.realAddresses;
    }

    if (params.callbackUrl !== undefined) {
      attributes.callback_url = params.callbackUrl;
    }

    if (params.description !== undefined) {
      attributes.description = params.description;
    }

    if (params.isBrowsable !== undefined) {
      attributes.is_browsable = params.isBrowsable;
    }

    let response = await this.axios.patch(`/proxy-bindings/${proxyBindingId}`, {
      data: {
        type: 'proxy_bindings',
        attributes
      }
    });

    return mapProxyBinding(response.data.data);
  }

  async listReceivedEmails(proxyBindingId: string): Promise<ReceivedEmailLink[]> {
    let response = await this.axios.get(`/received-emails-links/${proxyBindingId}`);
    let items = response.data.data || [];

    return items.map((item: any) => ({
      receivedEmailId: item.id,
      recipientEmail: item.attributes?.recipient_email ?? '',
      senderEmail: item.attributes?.sender_email ?? '',
      subject: item.attributes?.subject ?? '',
      attachmentsCount: item.attributes?.attachmentsCounter ?? 0,
      isProcessed: item.attributes?.is_processed ?? false,
      createdAt: item.attributes?.created_at ?? ''
    }));
  }

  async getReceivedEmail(receivedEmailId: string): Promise<ReceivedEmailDetail> {
    let response = await this.axios.get(`/received-emails/${receivedEmailId}`);
    let item = response.data.data;
    let attrs = item.attributes || {};
    let payload = attrs.payload || {};

    return {
      receivedEmailId: item.id,
      recipientEmail: attrs.recipient_email ?? '',
      senderEmail: attrs.sender_email ?? '',
      subject: payload.Subject ?? payload.subject ?? '',
      bodyHtml: payload['body-html'] ?? null,
      bodyPlain: payload['body-plain'] ?? null,
      from: payload.From ?? payload.from ?? null,
      to: payload.To ?? payload.to ?? null,
      attachments: (attrs.attachments || []).map((att: any) => ({ url: att.url })),
      isProcessed: attrs.is_processed ?? false,
      createdAt: attrs.created_at ?? ''
    };
  }

  async createWebhookReceiver(): Promise<WebhookReceiver> {
    let response = await this.axios.post('/callback');

    return {
      receiverId: response.data.id,
      callUrl: response.data.call_url,
      getUrl: response.data.get_url
    };
  }

  async pollWebhookReceiver(receiverId: string): Promise<WebhookReceiverStatus> {
    let response = await this.axios.get(`/callback/get/${receiverId}`);

    return {
      status: response.data.status ?? '',
      payload: response.data.payload ?? null,
      isReceived: response.data.isReceived ?? false,
      method: response.data.method ?? null
    };
  }
}

let mapProxyBinding = (item: any): ProxyBinding => {
  let attrs = item.attributes || {};
  let rawAddresses = attrs.real_addresses || {};

  let realAddresses: Record<
    string,
    { isEnabled: boolean; isVerificationNeeded: boolean; isVerified: boolean }
  > = {};
  for (let [email, info] of Object.entries(rawAddresses)) {
    let addrInfo = info as any;
    realAddresses[email] = {
      isEnabled: addrInfo.is_enabled ?? false,
      isVerificationNeeded: addrInfo.is_verification_needed ?? false,
      isVerified: addrInfo.is_verified ?? false
    };
  }

  return {
    proxyBindingId: item.id,
    proxyAddress: attrs.proxy_address ?? '',
    realAddresses,
    isBrowsable: attrs.is_browsable ?? false,
    receivedEmailsCount: attrs.received_emails ?? 0,
    description: attrs.description ?? null,
    callbackUrl: attrs.callback_url ?? null,
    createdAt: attrs.created_at ?? '',
    updatedAt: attrs.updated_at ?? ''
  };
};
