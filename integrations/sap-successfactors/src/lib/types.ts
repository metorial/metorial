export interface ODataResponse<T> {
  d: {
    results?: T[];
    __count?: string;
    __next?: string;
  } & T;
}

export interface ODataCollectionResponse<T> {
  d: {
    results: T[];
    __count?: string;
    __next?: string;
  };
}

export interface ODataMetadata {
  uri: string;
  type: string;
}

export interface EmployeeRecord {
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  defaultFullName?: string;
  status?: string;
  hireDate?: string;
  lastModifiedDateTime?: string;
  [key: string]: unknown;
}

export interface PersonalInfo {
  personIdExternal: string;
  startDate: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  gender?: string;
  dateOfBirth?: string;
  nationality?: string;
  maritalStatus?: string;
  [key: string]: unknown;
}

export interface EmploymentInfo {
  userId: string;
  personIdExternal?: string;
  startDate?: string;
  endDate?: string;
  isContingentWorker?: boolean;
  [key: string]: unknown;
}

export interface JobInfo {
  userId: string;
  seqNumber?: number;
  startDate?: string;
  endDate?: string;
  company?: string;
  department?: string;
  division?: string;
  location?: string;
  jobCode?: string;
  jobTitle?: string;
  position?: string;
  managerId?: string;
  eventReason?: string;
  customString1?: string;
  [key: string]: unknown;
}

export interface CompensationInfo {
  userId: string;
  seqNumber?: number;
  startDate?: string;
  payGrade?: string;
  payGroup?: string;
  [key: string]: unknown;
}

export interface JobRequisition {
  requisitionId?: string;
  jobReqId?: number;
  title?: string;
  status?: string;
  department?: string;
  division?: string;
  location?: string;
  recruiter?: string;
  hiringManager?: string;
  openDate?: string;
  closedDate?: string;
  numberOpenings?: number;
  [key: string]: unknown;
}

export interface JobApplication {
  applicationId?: number;
  candidateId?: number;
  jobReqId?: number;
  status?: string;
  source?: string;
  appliedDate?: string;
  lastModifiedDateTime?: string;
  [key: string]: unknown;
}

export interface Candidate {
  candidateId?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  cellPhone?: string;
  source?: string;
  [key: string]: unknown;
}

export interface TimeOff {
  timeType?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  approvalStatus?: string;
  quantityInDays?: number;
  quantityInHours?: number;
  [key: string]: unknown;
}

export interface EmployeeTimeAccount {
  timeAccountType?: string;
  userId?: string;
  bookingBalance?: number;
  bookingEndDate?: string;
  [key: string]: unknown;
}

export interface GoalPlan {
  id?: number;
  name?: string;
  userId?: string;
  category?: string;
  planType?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: unknown;
}

export interface GoalEntry {
  id?: number;
  name?: string;
  metric?: string;
  weight?: number;
  status?: string;
  done?: number;
  [key: string]: unknown;
}

export interface PerformanceReview {
  formDataId?: number;
  formTemplateId?: number;
  userId?: string;
  rating?: number;
  overallRating?: number;
  reviewStartDate?: string;
  reviewEndDate?: string;
  formStatus?: string;
  [key: string]: unknown;
}

export interface Position {
  code: string;
  effectiveStartDate?: string;
  positionTitle?: string;
  department?: string;
  division?: string;
  location?: string;
  company?: string;
  jobCode?: string;
  parentPosition?: string;
  [key: string]: unknown;
}

export interface Department {
  externalCode: string;
  name?: string;
  description?: string;
  headOfUnit?: string;
  parentDepartment?: string;
  [key: string]: unknown;
}

export interface SuccessionNominee {
  nomineeUserId?: string;
  positionCode?: string;
  readiness?: string;
  rank?: number;
  [key: string]: unknown;
}

export interface QueryOptions {
  top?: number;
  skip?: number;
  filter?: string;
  select?: string;
  expand?: string;
  orderBy?: string;
  inlineCount?: boolean;
  search?: string;
}
