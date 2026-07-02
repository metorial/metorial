export interface LastPassApiResponse {
  status?: string;
  errors?: string[];
  [key: string]: any;
}

export interface LastPassUser {
  username: string;
  fullname: string;
  mpstrength: string;
  created: string;
  last_pw_change: string;
  last_login: string;
  disabled: boolean;
  neverloggedin: boolean;
  linked: string;
  sites: number;
  notes: number;
  formfills: number;
  applications: number;
  attachments: number;
  groups: string[];
  admin: boolean;
  totalscore: string;
  multifactor: string;
  duousername: string;
}

export interface LastPassUserDataResponse extends LastPassApiResponse {
  Users: Record<string, LastPassUser>;
  Groups: Record<string, string[]>;
  Invited: string[];
}

export interface LastPassSharedFolderUser {
  username: string;
  readonly: string;
  give: string;
  can_administer: string;
  group_name?: string;
  sites?: string[];
}

export interface LastPassSharedFolder {
  sharedfoldername: string;
  score: number;
  users: LastPassSharedFolderUser[];
}

export interface LastPassEvent {
  Time: string;
  Username: string;
  IP_Address: string;
  Action: string;
  Data: string;
}

export interface LastPassEventReportResponse extends LastPassApiResponse {
  data: Record<string, LastPassEvent>;
}

export interface LastPassBatchAddUser {
  username: string;
  fullname?: string;
  groups?: string[];
  password_reset_required?: boolean;
}

export interface LastPassDeleteResult {
  username: string;
  success: boolean;
}

export interface LastPassDeleteResponse extends LastPassApiResponse {
  Delete?: LastPassDeleteResult[];
}
