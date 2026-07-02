import { createAxios } from '@slates/provider';
import { withFirebaseApiError } from './errors';

let fcmAxios = createAxios({
  baseURL: 'https://fcm.googleapis.com/v1'
});

export interface FcmNotification {
  title?: string;
  body?: string;
  imageUrl?: string;
}

export interface FcmAndroidConfig {
  collapseKey?: string;
  priority?: 'HIGH' | 'NORMAL';
  ttl?: string;
  notification?: {
    title?: string;
    body?: string;
    icon?: string;
    color?: string;
    sound?: string;
    clickAction?: string;
    channelId?: string;
  };
}

export interface FcmApnsConfig {
  headers?: Record<string, string>;
  payload?: Record<string, any>;
}

export interface FcmWebpushConfig {
  headers?: Record<string, string>;
  notification?: Record<string, any>;
  fcmOptions?: {
    link?: string;
  };
}

export interface FcmMessage {
  token?: string;
  topic?: string;
  condition?: string;
  notification?: FcmNotification;
  data?: Record<string, string>;
  android?: FcmAndroidConfig;
  apns?: FcmApnsConfig;
  webpush?: FcmWebpushConfig;
}

export class MessagingClient {
  private token: string;
  private projectId: string;

  constructor(params: { token: string; projectId: string }) {
    this.token = params.token;
    this.projectId = params.projectId;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'x-goog-user-project': this.projectId
    };
  }

  async sendMessage(
    message: FcmMessage,
    params?: { validateOnly?: boolean }
  ): Promise<{ messageId: string }> {
    let response = await withFirebaseApiError('Cloud Messaging send message', () =>
      fcmAxios.post(
        `/projects/${this.projectId}/messages:send`,
        {
          validate_only: params?.validateOnly,
          message
        },
        {
          headers: this.headers
        }
      )
    );

    return {
      messageId: response.data.name
    };
  }

  async subscribeToTopic(
    tokens: string[],
    topic: string
  ): Promise<{
    successCount: number;
    failureCount: number;
    errors: Array<{ index: number; reason: string }>;
  }> {
    let iidAxios = createAxios({
      baseURL: 'https://iid.googleapis.com'
    });

    let response = await withFirebaseApiError('Cloud Messaging subscribe topic', () =>
      iidAxios.post(
        `/iid/v1:batchAdd`,
        {
          to: `/topics/${topic}`,
          registration_tokens: tokens
        },
        {
          headers: {
            ...this.headers,
            access_token_auth: 'true'
          }
        }
      )
    );

    let results = response.data.results || [];
    let errors: Array<{ index: number; reason: string }> = [];
    let successCount = 0;
    let failureCount = 0;

    results.forEach((result: any, index: number) => {
      if (result.error) {
        failureCount++;
        errors.push({ index, reason: result.error });
      } else {
        successCount++;
      }
    });

    return { successCount, failureCount, errors };
  }

  async unsubscribeFromTopic(
    tokens: string[],
    topic: string
  ): Promise<{
    successCount: number;
    failureCount: number;
    errors: Array<{ index: number; reason: string }>;
  }> {
    let iidAxios = createAxios({
      baseURL: 'https://iid.googleapis.com'
    });

    let response = await withFirebaseApiError('Cloud Messaging unsubscribe topic', () =>
      iidAxios.post(
        `/iid/v1:batchRemove`,
        {
          to: `/topics/${topic}`,
          registration_tokens: tokens
        },
        {
          headers: {
            ...this.headers,
            access_token_auth: 'true'
          }
        }
      )
    );

    let results = response.data.results || [];
    let errors: Array<{ index: number; reason: string }> = [];
    let successCount = 0;
    let failureCount = 0;

    results.forEach((result: any, index: number) => {
      if (result.error) {
        failureCount++;
        errors.push({ index, reason: result.error });
      } else {
        successCount++;
      }
    });

    return { successCount, failureCount, errors };
  }
}
