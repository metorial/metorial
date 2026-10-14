export interface PaginatedResponse<T> {
  count: number;
  data: T[];
  has_more: boolean;
}

export type ResourceReference = string | { id: string; [key: string]: unknown };

export interface Booking {
  object: string;
  id: string;
  tracking_id: string;
  subject: string;
  status: string;
  creation_time: string;
  starting_time: string;
  customer_timezone: string;
  last_updated_time: string;
  owner: ResourceReference;
  duration_minutes: number;
  virtual_conferencing: {
    join_url: string;
  } | null;
  location_description: string | null;
  rescheduled_booking_id: string | null;
  cancel_reschedule_information: CancelRescheduleInfo | CancelRescheduleInfo[] | null;
  attendees: string[];
  form_submission: FormSubmission | null;
  booking_page?: ResourceReference | null;
  master_page?: ResourceReference | null;
  event_type?: ResourceReference | null;
  booking_calendar?: ResourceReference | null;
  contact?: ResourceReference | null;
  conversation?: ResourceReference | null;
  cancel_url?: string | null;
  reschedule_url?: string | null;
}

export interface CancelRescheduleInfo {
  reason: string | null;
  actioned_by: string;
  user_id: string | null;
}

export interface FormSubmission {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile_phone?: string | null;
  note?: string | null;
  company?: string | null;
  guests?: string[];
  custom_fields?: CustomField[];
}

export interface CustomField {
  name: string;
  value: unknown;
}

export interface BookingCalendar {
  object: string;
  id: string;
  subject: string;
  host: string;
  url: string;
  name: string;
  published: boolean;
  duration_minutes: number;
}

export interface BookingPage {
  object: string;
  id: string;
  name: string;
  url: string;
  active: boolean;
  published?: boolean;
  label?: string;
  timezone?: string;
}

export interface MasterPage {
  object: string;
  id: string;
  name: string;
}

export interface EventType {
  object: string;
  id: string;
  name: string;
  description: string | null;
  duration_minutes?: number | null;
}

export interface User {
  object: string;
  id: string;
  name?: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface AvailableTimeSlot {
  start_time: string;
  locations: {
    type: string;
    value: string | null;
    id: string | null;
  }[];
}

export interface Team {
  object: string;
  id: string;
  name: string;
}

export interface Webhook {
  object: string;
  id: string;
  api_version: string;
  name: string;
  url: string;
  events: string[];
  creation_time: string;
  secret: string;
}

export interface WebhookEvent {
  id: string;
  object: string;
  creation_time: string;
  type: string;
  api_version: string;
  data: Booking;
}

export interface ListBookingsParams {
  startingTimeGt?: string;
  startingTimeLt?: string;
  lastUpdatedTimeGt?: string;
  creationTimeGt?: string;
  status?: string;
  owner?: string;
  bookingPage?: string;
  eventType?: string;
  bookingCalendar?: string;
  expand?: string[];
  limit?: number;
  after?: string;
  before?: string;
}

export interface PaginationParams {
  limit?: number;
  after?: string;
  before?: string;
}
