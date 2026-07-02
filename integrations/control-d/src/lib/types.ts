// Control D API response wrapper
export interface ApiResponse<T> {
  body: T;
  success: boolean;
  message?: string;
  error?: {
    date: string;
    message: string;
    code: number;
  };
}

// Action types for rules, services, filters
export interface ActionConfig {
  do: number; // 0=BLOCK, 1=BYPASS, 2=SPOOF, 3=REDIRECT
  via?: string;
  via_v6?: string;
  status: number; // 0=disabled, 1=enabled
}

// Profile types
export interface ProfileOption {
  PK: string;
  value: number;
}

export interface ProfileSummary {
  flt: { count: number };
  cflt: { count: number };
  ipflt: { count: number };
  rule: { count: number };
  svc: { count: number };
  grp: { count: number };
  opt: {
    count: number;
    data: ProfileOption[];
  };
  da: ActionConfig[];
}

export interface Profile {
  PK: string;
  updated: number;
  name: string;
  stats: number;
  profile: ProfileSummary;
}

// Filter types
export interface FilterOption {
  title: string;
  description: string;
  type: string;
  name: string;
  status: number;
}

export interface Filter {
  PK: string;
  name: string;
  description: string;
  additional: string;
  sources: string[];
  options: FilterOption[];
  status: number;
}

// Service types
export interface ServiceCategory {
  PK: string;
  name: string;
  description: string;
  count: number;
}

export interface Service {
  PK: string;
  name: string;
  category: string;
  locations: string[];
  unlock_location: string;
  warning: string;
  action?: ActionConfig;
}

// Custom Rule types
export interface RuleFolder {
  PK: number;
  group: string;
  action: ActionConfig;
  count: number;
}

export interface CustomRule {
  PK: string;
  order: number;
  group: number;
  action: ActionConfig;
}

// Device types
export interface DeviceResolvers {
  uid: string;
  doh: string;
  dot: string;
  v4: string[];
  v6: string[];
}

export interface DeviceProfile {
  PK: string;
  updated: number;
  name: string;
}

export interface Device {
  PK: string;
  ts: number;
  name: string;
  device_id: string;
  status: number;
  stats: number;
  restricted: number;
  learn_ip: number;
  desc: string;
  icon: string;
  ddns: {
    status: number;
    subdomain: string;
    hostname: string;
    record: string;
  };
  ddns_ext: {
    status: number;
    host: string;
  };
  resolvers: DeviceResolvers;
  legacy_ipv4: {
    resolver: string;
    status: number;
  };
  profile: DeviceProfile;
}

// Access / IP types
export interface LearnedIp {
  ip: string;
  ts: number;
  type: string;
  country: string;
}

// Proxy types
export interface Proxy {
  PK: string;
  country: string;
  country_name: string;
  city: string;
  city_name: string;
  gps_lat: number;
  gps_long: number;
}

// Organization types
export interface Organization {
  PK: string;
  name: string;
  website: string;
  address: string;
  contact_email: string;
  status: number;
  date: string;
  stats_endpoint: string;
  max_profiles: number;
  max_users: number;
  max_routers: number;
  max_legacy_resolvers: number;
  max_sub_orgs: number;
  members: { count: number };
  profiles: { count: number };
  users: { count: number };
  routers: { count: number };
  sub_organizations: { count: number };
}

export interface OrgMember {
  PK: string;
  email: string;
  last_active: number;
  twofa: number;
  status: number;
  permission: {
    level: number;
    printable: string;
  };
}

export interface SubOrganization {
  PK: string;
  name: string;
  contact_email: string;
  contact_name: string;
  contact_phone: string;
  website: string;
  address: string;
  status: number;
  date: string;
  twofa_req: number;
  stats_endpoint: string;
  max_profiles: number;
  max_users: number;
  max_routers: number;
  max_legacy_resolvers: number;
  parent_org: string;
  parent_profile: string;
}

// User / Account types
export interface User {
  PK: string;
  email: string;
  last_active: number;
  proxy_access: number;
  email_status: number;
  status: number;
  date: string;
  twofa: number;
}

// Billing types
export interface Payment {
  PK: string;
  amount: number;
  currency: string;
  date: string;
  description: string;
  status: string;
}

export interface Subscription {
  PK: string;
  status: string;
  plan: string;
  amount: number;
  currency: string;
  next_billing_date: string;
}

export interface Product {
  PK: string;
  name: string;
  status: string;
}

// Profile Option definition
export interface ProfileOptionDefinition {
  PK: string;
  title: string;
  description: string;
  type: string;
  default_value: number;
  info_url: string;
}

// Default Rule
export interface DefaultRule {
  do: number;
  via: string;
  status: number;
}

// Analytics
export interface AnalyticsLevel {
  PK: string;
  name: string;
  description: string;
}

export interface AnalyticsEndpoint {
  PK: string;
  name: string;
  description: string;
}

// Network IP
export interface IpInfo {
  ip: string;
  type: string;
  org: string;
  country: string;
  handler: string;
}

// Device type category
export interface DeviceTypeCategory {
  PK: string;
  name: string;
  icons: string[];
}
