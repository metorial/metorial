import { createApiServiceError, createAuthenticatedAxios } from 'slates';
import { z } from 'zod';
import { parseProxiedMailResponse, proxiedMailError } from './errors';

let addressInfoSchema = z.object({
  is_enabled: z.boolean(),
  is_verification_needed: z.boolean().optional(),
  is_verified: z.boolean()
});
let bindingSchema = z.object({
  id: z.string(),
  attributes: z.object({
    proxy_address: z.string(),
    real_addresses: z.record(z.string(), addressInfoSchema),
    is_browsable: z.boolean().optional(),
    received_emails: z.number(),
    description: z.string().nullable(),
    callback_url: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string()
  })
});
let bindingResponseSchema = z.object({ data: bindingSchema });
let listBindingSchema = bindingSchema.extend({
  attributes: bindingSchema.shape.attributes.extend({
    real_addresses: z.record(
      z.string(),
      addressInfoSchema.extend({ is_verification_needed: z.boolean() })
    )
  })
});
let receivedEmailLinkResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      attributes: z.object({
        recipient_email: z.string(),
        sender_email: z.string(),
        subject: z.string(),
        attachmentsCounter: z.number(),
        is_processed: z.boolean(),
        created_at: z.string()
      })
    })
  )
});
let receivedEmailResponseSchema = z.object({
  data: z.object({
    id: z.string(),
    attributes: z.object({
      recipient_email: z.string(),
      sender_email: z.string(),
      payload: z.object({
        Subject: z.string().optional(),
        subject: z.string().optional(),
        'body-html': z.string().nullable().optional(),
        'body-plain': z.string().nullable().optional(),
        From: z.string().nullable().optional(),
        from: z.string().nullable().optional(),
        To: z.string().nullable().optional(),
        to: z.string().nullable().optional()
      }),
      attachments: z.array(z.object({ url: z.string() })),
      is_processed: z.boolean(),
      created_at: z.string()
    })
  })
});

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
  payload: unknown;
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
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token) {
      throw createApiServiceError(
        'A ProxiedMail API token is required. Reconnect your account.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://proxiedmail.com/api/v1',
      authHeader: { name: 'Token', value: config.token },
      headers: {
        Accept: 'application/json'
      },
      errorAdapter: proxiedMailError
    });
    this.axios.interceptors.response.use(response => {
      if (response.data?.data?.type === 'errors') {
        throw proxiedMailError({ response });
      }
      return response;
    });
  }

  async listProxyEmails() {
    let response = await this.axios.get('/proxy-bindings');
    let data = parseProxiedMailResponse(
      z.object({
        data: z.array(listBindingSchema),
        meta: z.object({ usedProxyBindings: z.number(), availableProxyBindings: z.number() })
      }),
      response.data
    );

    let bindings = data.data.map(item => ({
      ...mapProxyBinding(item),
      realAddresses: Object.fromEntries(
        Object.entries(item.attributes.real_addresses).map(([email, info]) => [
          email,
          {
            isEnabled: info.is_enabled,
            isVerificationNeeded: info.is_verification_needed,
            isVerified: info.is_verified
          }
        ])
      )
    }));

    return {
      bindings,
      meta: {
        usedProxyBindings: data.meta.usedProxyBindings,
        availableProxyBindings: data.meta.availableProxyBindings
      }
    };
  }

  async createProxyEmail(params: CreateProxyEmailParams) {
    let attributes: Record<string, unknown> = {};

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

    return mapProxyBinding(
      parseProxiedMailResponse(bindingResponseSchema, response.data).data
    );
  }

  async updateProxyEmail(proxyBindingId: string, params: UpdateProxyEmailParams) {
    let attributes: Record<string, unknown> = {};

    if (params.realAddresses !== undefined) {
      attributes.real_addresses = Object.fromEntries(
        params.realAddresses.map(email => [email, true])
      );
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

    let response = await this.axios.patch(
      `/proxy-bindings/${encodeURIComponent(proxyBindingId)}`,
      {
        data: {
          id: proxyBindingId,
          type: 'proxy_bindings',
          attributes
        }
      }
    );

    return mapProxyBinding(
      parseProxiedMailResponse(bindingResponseSchema, response.data).data
    );
  }

  async listReceivedEmails(proxyBindingId: string): Promise<ReceivedEmailLink[]> {
    let response = await this.axios.get(
      `/received-emails-links/${encodeURIComponent(proxyBindingId)}`
    );
    let items = parseProxiedMailResponse(receivedEmailLinkResponseSchema, response.data).data;

    return items.map(item => ({
      receivedEmailId: item.id,
      recipientEmail: item.attributes.recipient_email,
      senderEmail: item.attributes.sender_email,
      subject: item.attributes.subject,
      attachmentsCount: item.attributes.attachmentsCounter,
      isProcessed: item.attributes.is_processed,
      createdAt: item.attributes.created_at
    }));
  }

  async getReceivedEmail(receivedEmailId: string): Promise<ReceivedEmailDetail> {
    let response = await this.axios.get(
      `/received-emails/${encodeURIComponent(receivedEmailId)}`
    );
    let item = parseProxiedMailResponse(receivedEmailResponseSchema, response.data).data;
    let attrs = item.attributes;
    let payload = attrs.payload;
    let subject = payload.Subject ?? payload.subject;
    if (subject === undefined) {
      throw createApiServiceError('ProxiedMail returned an email without a subject field.', {
        reason: 'proxiedmail_invalid_response'
      });
    }

    return {
      receivedEmailId: item.id,
      recipientEmail: attrs.recipient_email,
      senderEmail: attrs.sender_email,
      subject,
      bodyHtml: payload['body-html'] ?? null,
      bodyPlain: payload['body-plain'] ?? null,
      from: payload.From ?? payload.from ?? null,
      to: payload.To ?? payload.to ?? null,
      attachments: attrs.attachments.map(att => ({ url: att.url })),
      isProcessed: attrs.is_processed,
      createdAt: attrs.created_at
    };
  }

  async createWebhookReceiver(): Promise<WebhookReceiver> {
    let response = await this.axios.post('/callback');
    let receiver = parseProxiedMailResponse(
      z.object({
        id: z.string(),
        call_url: z.string(),
        get_url: z.string()
      }),
      response.data
    );

    return {
      receiverId: receiver.id,
      callUrl: receiver.call_url,
      getUrl: receiver.get_url
    };
  }

  async pollWebhookReceiver(receiverId: string): Promise<WebhookReceiverStatus> {
    let response = await this.axios.get(`/callback/get/${encodeURIComponent(receiverId)}`);
    let result = parseProxiedMailResponse(
      z.object({
        status: z.string(),
        payload: z.unknown(),
        is_received: z.boolean(),
        method: z.string().nullable()
      }),
      response.data
    );

    return {
      status: result.status,
      payload: result.payload,
      isReceived: result.is_received,
      method: result.method
    };
  }
}

let mapProxyBinding = (item: z.infer<typeof bindingSchema>) => {
  let attrs = item.attributes;
  let rawAddresses = attrs.real_addresses;

  let realAddresses: Record<
    string,
    { isEnabled: boolean; isVerificationNeeded?: boolean; isVerified: boolean }
  > = {};
  for (let [email, info] of Object.entries(rawAddresses)) {
    realAddresses[email] = {
      isEnabled: info.is_enabled,
      isVerificationNeeded: info.is_verification_needed,
      isVerified: info.is_verified
    };
  }

  return {
    proxyBindingId: item.id,
    proxyAddress: attrs.proxy_address,
    realAddresses,
    isBrowsable: attrs.is_browsable,
    receivedEmailsCount: attrs.received_emails,
    description: attrs.description,
    callbackUrl: attrs.callback_url,
    createdAt: attrs.created_at,
    updatedAt: attrs.updated_at
  };
};
