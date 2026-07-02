import { createAxios } from 'slates';

export interface ConversionEvent {
  click_id?: string;
  event_at: string;
  event_type: {
    tracking_type: string;
    custom_event_name?: string;
  };
  user?: {
    email?: string;
    external_id?: string;
    uuid?: string;
    ip_address?: string;
    user_agent?: string;
    idfa?: string;
    aaid?: string;
    screen_width?: number;
    screen_height?: number;
    data_processing_options?: Record<string, any>;
  };
  event_metadata?: {
    conversion_id?: string;
    item_count?: number;
    currency?: string;
    value_decimal?: number;
    products?: Array<{
      id?: string;
      name?: string;
      category?: string;
    }>;
  };
}

export class ConversionsClient {
  private ax: ReturnType<typeof createAxios>;
  private pixelId: string;

  constructor(config: { token: string; pixelId: string }) {
    this.pixelId = config.pixelId;
    this.ax = createAxios({
      baseURL: 'https://ads-api.reddit.com/api/v2.0',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async sendConversionEvents(events: ConversionEvent[]): Promise<any> {
    let response = await this.ax.post(`/conversions/events/${this.pixelId}`, {
      events
    });
    return response.data;
  }
}
