export interface JumpCloudUser {
  _id: string;
  username: string;
  email: string;
  firstname?: string;
  lastname?: string;
  displayname?: string;
  state?: string;
  activated?: boolean;
  company?: string;
  department?: string;
  jobTitle?: string;
  employeeIdentifier?: string;
  employeeType?: string;
  location?: string;
  alternateEmail?: string;
  description?: string;
  ldap_binding_user?: boolean;
  sudo?: boolean;
  enable_managed_uid?: boolean;
  enable_user_portal_multifactor?: boolean;
  password_never_expires?: boolean;
  passwordless_sudo?: boolean;
  externally_managed?: boolean;
  external_dn?: string;
  external_source_type?: string;
  suspended?: boolean;
  created?: string;
  organization?: string;
  addresses?: Array<{
    country?: string;
    extendedAddress?: string;
    locality?: string;
    poBox?: string;
    postalCode?: string;
    region?: string;
    streetAddress?: string;
    type?: string;
  }>;
  phoneNumbers?: Array<{
    number?: string;
    type?: string;
  }>;
  attributes?: Array<{
    name: string;
    value: string;
  }>;
  mfa?: {
    configured?: boolean;
    exclusion?: boolean;
    exclusionUntil?: string;
  };
  [key: string]: any;
}

export interface JumpCloudSystem {
  _id: string;
  displayName?: string;
  hostname?: string;
  os?: string;
  osFamily?: string;
  version?: string;
  arch?: string;
  agentVersion?: string;
  active?: boolean;
  allowMultiFactorAuthentication?: boolean;
  allowPublicKeyAuthentication?: boolean;
  allowSshPasswordAuthentication?: boolean;
  allowSshRootLogin?: boolean;
  created?: string;
  lastContact?: string;
  remoteIP?: string;
  serialNumber?: string;
  systemTimezone?: number;
  organization?: string;
  connectionHistory?: any[];
  tags?: string[];
  [key: string]: any;
}

export interface JumpCloudGroup {
  id: string;
  name: string;
  description?: string;
  type?: string;
  email?: string;
  attributes?: Record<string, any>;
  memberQuery?: any;
  memberQueryExemptions?: any[];
  memberSuggestionsNotify?: boolean;
  membershipMethod?: string;
  [key: string]: any;
}

export interface JumpCloudCommand {
  _id: string;
  name: string;
  command: string;
  commandType: string;
  user?: string;
  sudo?: boolean;
  schedule?: string;
  scheduleRepeatType?: string;
  launchType?: string;
  trigger?: string;
  timeout?: string;
  shell?: string;
  files?: string[];
  organization?: string;
  systems?: string[];
  [key: string]: any;
}

export interface JumpCloudCommandResult {
  _id: string;
  command: string;
  name: string;
  system: string;
  systemId: string;
  organization: string;
  workflowId?: string;
  workflowInstanceId?: string;
  requestTime: string;
  responseTime?: string;
  response?: {
    data?: {
      exitCode?: number;
      output?: string;
      error?: string;
    };
  };
  exitCode?: number;
  [key: string]: any;
}

export interface JumpCloudApplication {
  _id: string;
  name: string;
  displayName?: string;
  displayLabel?: string;
  ssoUrl?: string;
  organization?: string;
  active?: boolean;
  beta?: boolean;
  created?: string;
  learnMore?: string;
  config?: Record<string, any>;
  [key: string]: any;
}

export interface JumpCloudEvent {
  id?: string;
  timestamp?: string;
  event_type?: string;
  service?: string;
  initiated_by?: {
    id?: string;
    type?: string;
    email?: string;
  };
  resource?: {
    id?: string;
    type?: string;
  };
  organization?: string;
  changes?: any[];
  [key: string]: any;
}

export interface PaginatedResponse<T> {
  results: T[];
  totalCount: number;
}

export interface AssociationRequest {
  op: 'add' | 'remove' | 'update';
  type: string;
  id: string;
  attributes?: Record<string, any>;
}

export interface Association {
  to: {
    id: string;
    type: string;
    attributes?: Record<string, any>;
  };
  paths?: {
    to: { id: string; type: string };
    attributes?: Record<string, any>;
  }[][];
}
