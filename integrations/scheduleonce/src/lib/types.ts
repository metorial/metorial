export interface PaginatedResponse<T> {
  count: number;
  data: T[];
}

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
  owner: string;
  duration_minutes: number;
  virtual_conferencing: {
    join_url: string;
  } | null;
  location_description: string | null;
  rescheduled_booking_id: string | null;
  cancel_reschedule_information: CancelRescheduleInfo[] | null;
  attendees: string[];
  form_submission: FormSubmission | null;
  booking_page: string | null;
  master_page: string | null;
  event_type: string | null;
  booking_calendar: string | null;
}

export interface CancelRescheduleInfo {
  reason: string | null;
  actioned_by: string;
  user_id: string | null;
}

export interface FormSubmission {
  name: string | null;
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;
  note: string | null;
  company: string | null;
  guests: string[];
  custom_fields: CustomField[];
}

export interface CustomField {
  name: string;
  value: string;
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
  published: boolean;
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
  duration_minutes: number | null;
}

export interface User {
  object: string;
  id: string;
  name: string;
  email: string;
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
