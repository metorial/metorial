export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Campaign {
  id: number;
  content_type: number;
  custom_url?: string;
  markdown_card?: number;
  form?: number;
  schedule?: number;
  campaign_active?: boolean;
  organization?: number;
  created?: string;
  updated?: string;
}

export interface CampaignNotification {
  id: number;
  language_code: string;
  is_default: boolean;
  title?: string;
  description?: string;
  icon_url?: string;
  app_intent?: string;
  banner_type?: number;
  banner_image_url?: string;
  meta?: Record<string, unknown>;
  slug?: string;
  created?: string;
  updated?: string;
}

export interface QrCode {
  id: number;
  name: string;
  organization: number;
  qr_type: number;
  campaign?: Campaign;
  fields_data?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
  place?: number;
  location_enabled?: boolean;
  url?: string;
  created?: string;
  updated?: string;
  tags?: number[];
}

export interface Beacon {
  id: number;
  name: string;
  UUID?: string;
  major?: number;
  minor?: number;
  place?: number;
  campaign?: Campaign;
  campaign_notifications?: CampaignNotification[];
  tags?: number[];
  battery?: number;
  temperature?: number;
  latitude?: number;
  longitude?: number;
  state?: string;
  heartbeat?: string;
  serial_number?: string;
  url?: string;
  created?: string;
  updated?: string;
}

export interface NfcTag {
  id: number;
  name: string;
  uid?: string;
  counter?: number;
  place?: number;
  url?: string;
  state?: string;
  campaign?: Campaign;
  heartbeat?: string;
  tags?: number[];
  created?: string;
  updated?: string;
}

export interface Geofence {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  place?: number;
  campaign?: Campaign;
  campaign_notifications?: CampaignNotification[];
  organization?: number;
  created?: string;
  updated?: string;
}

export interface Place {
  id: number;
  name: string;
  place_id?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  organization?: number;
  created?: string;
  updated?: string;
}

export interface Form {
  id: number;
  title?: string;
  url?: string;
  form_id?: string;
  form_type?: string;
  organization?: number;
  created?: string;
  updated?: string;
}

export interface MarkdownCard {
  id: number;
  title?: string;
  description?: string;
  language_code?: string;
  body?: string;
  organization?: number;
  created?: string;
  updated?: string;
}

export interface AnalyticsOverview {
  product_count?: number;
  notification_count?: number;
  impression_count?: number;
  conversion_percentage?: number;
  unique_visitors?: number;
}

export interface AnalyticsPerformance {
  data: Record<string, unknown>[];
}

export interface BulkQrCode {
  id: number;
  name?: string;
  organization?: number;
  status?: string;
  qr_codes_count?: number;
  created?: string;
  updated?: string;
}
