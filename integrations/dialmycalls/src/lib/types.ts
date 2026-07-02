export interface Contact {
  id?: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  extension?: string;
  email?: string;
  extra1?: string;
  miscellaneous?: string;
  groups?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Group {
  id?: string;
  name?: string;
  contacts_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Recording {
  id?: string;
  name?: string;
  type?: string;
  seconds?: number;
  url?: string;
  processed?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CallerId {
  id?: string;
  name?: string;
  phone?: string;
  approved?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Callservice {
  id?: string;
  accessaccount_id?: string;
  name?: string;
  recording_id?: string;
  pending_cancel?: boolean;
  credit_cost?: number;
  total_recipients?: number;
  send_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TextService {
  id?: string;
  accessaccount_id?: string;
  name?: string;
  pending_cancel?: boolean;
  credit_cost?: number;
  total_recipients?: number;
  send_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CallRecipient {
  firstname?: string;
  lastname?: string;
  miscellaneous?: string;
  email?: string;
  phone?: string;
  extension?: string;
  status?: string;
  duration?: number;
  add_on?: string;
  attempts?: string;
  successful?: boolean;
  called_at?: string;
}

export interface TextRecipient {
  firstname?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  status?: string;
  successful?: boolean;
}

export interface IncomingText {
  id?: string;
  from_number?: string;
  to_number?: string;
  message?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Keyword {
  id?: string;
  keyword?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface VanityNumber {
  id?: string;
  phone?: string;
  status?: string;
  minutes_used?: number;
  minutes_allowed?: number;
  voicemails_new?: number;
  voicemails_old?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DoNotContact {
  id?: string;
  phone?: string;
  type?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AccessAccount {
  id?: string;
  name?: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Account {
  credits_available?: number;
  created_at?: string;
}

export interface Shortcode {
  id?: string;
  shortcode?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ContactAttributes {
  phone?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
}

export interface CreateContactParams {
  phone: string;
  firstname?: string;
  lastname?: string;
  extension?: string;
  email?: string;
  extra1?: string;
  groups?: string[];
}

export interface UpdateContactParams {
  phone?: string;
  firstname?: string;
  lastname?: string;
  extension?: string;
  email?: string;
  extra1?: string;
  groups?: string[];
}

export interface CreateGroupParams {
  name: string;
}

export interface UpdateGroupParams {
  name: string;
}

export interface CreateCallParams {
  name: string;
  callerid_id: string;
  recording_id: string;
  contacts: ContactAttributes[];
  machine_recording_id?: string;
  send_at?: string;
  send_immediately?: boolean;
  use_amd?: boolean;
  send_email?: boolean;
  accessaccount_id?: string;
  add_ons?: Array<{ type: string; add_message?: Record<string, unknown> }>;
}

export interface CreateTextParams {
  name: string;
  keyword_id: string;
  messages: string[];
  contacts: ContactAttributes[];
  send_at?: string;
  send_immediately?: boolean;
  send_email?: boolean;
  accessaccount_id?: string;
  shortcode_id?: string;
  concatenate_sms?: boolean;
}

export interface CreateRecordingTtsParams {
  name: string;
  gender: string;
  language: string;
  text: string;
}

export interface CreateRecordingByUrlParams {
  name: string;
  url: string;
}

export interface CreateRecordingByPhoneParams {
  name: string;
  phone: string;
  callerid_id?: string;
  extension?: string;
  whitelabel?: boolean;
}

export interface CreateCallerIdParams {
  phone: string;
  name: string;
}

export interface CreateAccessAccountParams {
  email: string;
  password: string;
  name: string;
}

export interface UpdateAccessAccountParams {
  email?: string;
  password?: string;
  name?: string;
}

export interface UpdateVanityNumberParams {
  call_options?: string[];
  recording_source?: string;
  specific_recording_id?: string;
  play_cta?: boolean;
  ptt_number_id?: string;
}
