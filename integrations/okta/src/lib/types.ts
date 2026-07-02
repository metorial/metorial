export interface OktaUser {
  id: string;
  status: string;
  created: string;
  activated: string | null;
  statusChanged: string | null;
  lastLogin: string | null;
  lastUpdated: string;
  passwordChanged: string | null;
  type: { id: string };
  profile: {
    firstName?: string;
    lastName?: string;
    email?: string;
    login?: string;
    mobilePhone?: string | null;
    secondEmail?: string | null;
    displayName?: string;
    nickName?: string;
    title?: string;
    department?: string;
    organization?: string;
    [key: string]: any;
  };
  credentials?: {
    provider?: {
      type: string;
      name: string;
    };
    [key: string]: any;
  };
  _links?: Record<string, any>;
}

export interface OktaGroup {
  id: string;
  created: string;
  lastUpdated: string;
  lastMembershipUpdated: string;
  type: string;
  profile: {
    name: string;
    description?: string;
    [key: string]: any;
  };
  _links?: Record<string, any>;
}

export interface OktaApplication {
  id: string;
  name: string;
  label: string;
  status: string;
  created: string;
  lastUpdated: string;
  signOnMode: string;
  accessibility?: {
    selfService?: boolean;
    errorRedirectUrl?: string | null;
    loginRedirectUrl?: string | null;
  };
  visibility?: {
    autoSubmitToolbar?: boolean;
    hide?: {
      iOS?: boolean;
      web?: boolean;
    };
  };
  features?: string[];
  credentials?: Record<string, any>;
  settings?: Record<string, any>;
  _links?: Record<string, any>;
}

export interface OktaLogEvent {
  uuid: string;
  published: string;
  eventType: string;
  version: string;
  severity: string;
  legacyEventType?: string;
  displayMessage: string;
  actor: {
    id: string;
    type: string;
    alternateId?: string;
    displayName?: string;
  };
  client?: {
    userAgent?: { rawUserAgent?: string; os?: string; browser?: string };
    zone?: string;
    device?: string;
    id?: string;
    ipAddress?: string;
    geographicalContext?: {
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
      geolocation?: { lat?: number; lon?: number };
    };
  };
  outcome: {
    result: string;
    reason?: string;
  };
  target?: Array<{
    id: string;
    type: string;
    alternateId?: string;
    displayName?: string;
  }>;
  transaction?: {
    type?: string;
    id?: string;
  };
  debugContext?: {
    debugData?: Record<string, any>;
  };
  authenticationContext?: {
    authenticationProvider?: string;
    credentialProvider?: string;
    credentialType?: string;
    externalSessionId?: string;
    interface?: string;
  };
  securityContext?: {
    asNumber?: number;
    asOrg?: string;
    isp?: string;
    domain?: string;
    isProxy?: boolean;
  };
}

export interface OktaEventHook {
  id: string;
  status: string;
  name: string;
  created: string;
  lastUpdated: string;
  events: {
    type: string;
    items: string[];
  };
  channel: {
    type: string;
    version: string;
    config: {
      uri: string;
      headers?: Array<{ key: string; value: string }>;
      authScheme?: {
        type: string;
        key: string;
        value?: string;
      };
    };
  };
}

export interface OktaPolicy {
  id: string;
  status: string;
  name: string;
  description?: string;
  priority: number;
  system: boolean;
  type: string;
  created: string;
  lastUpdated: string;
  conditions?: Record<string, any>;
  _links?: Record<string, any>;
}

export interface OktaFactor {
  id: string;
  factorType: string;
  provider: string;
  vendorName?: string;
  status: string;
  created?: string;
  lastUpdated?: string;
  profile?: Record<string, any>;
  _links?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextUrl: string | null;
}
