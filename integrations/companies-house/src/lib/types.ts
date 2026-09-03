export type ProviderRecord = Record<string, unknown>;

export type ProviderEnvelope<T extends ProviderRecord = ProviderRecord> = ProviderRecord & {
  items?: T[];
  items_per_page?: number;
  start_index?: number;
  total_count?: number;
  total_results?: number;
};

export type AdvancedCompanySearchEnvelope = ProviderRecord & {
  hits: string;
  items?: ProviderRecord[];
  top_hit?: ProviderRecord;
};

export type MappedAddress = {
  addressLine1?: string;
  addressLine2?: string;
  careOf?: string;
  country?: string;
  locality?: string;
  poBox?: string;
  postalCode?: string;
  premises?: string;
  region?: string;
  record: ProviderRecord;
};

export type MappedCompany = {
  companyNumber?: string;
  name?: string;
  status?: string;
  type?: string;
  subtype?: string;
  createdOn?: string;
  ceasedOn?: string;
  address?: MappedAddress;
  record: ProviderRecord;
};

export type MappedCompanySearchItem = {
  companyNumber: string;
  name: string;
  status?: string;
  type?: string;
  incorporatedOn?: string;
  dissolvedOn?: string;
  addressSnippet?: string;
  profileUrl?: string;
  record: ProviderRecord;
};

export type MappedDatedRecord = {
  dueOn?: string;
  madeUpTo?: string;
  periodStartOn?: string;
  periodEndOn?: string;
  type?: string;
  overdue?: boolean;
  record: ProviderRecord;
};

export type MappedCompanyAccounts = {
  accountingReferenceDate?: {
    day?: number;
    month?: number;
    record: ProviderRecord;
  };
  lastAccounts?: MappedDatedRecord;
  nextAccounts?: MappedDatedRecord;
  nextDueOn?: string;
  nextMadeUpTo?: string;
  overdue?: boolean;
  record: ProviderRecord;
};

export type MappedConfirmationStatement = {
  lastMadeUpTo?: string;
  nextDueOn?: string;
  nextMadeUpTo?: string;
  overdue?: boolean;
  record: ProviderRecord;
};

export type MappedPreviousCompanyName = {
  name: string;
  effectiveFrom?: string;
  ceasedOn?: string;
  record: ProviderRecord;
};

export type MappedCompanyProfile = {
  companyNumber: string;
  name: string;
  status?: string;
  statusDetail?: string;
  type?: string;
  subtype?: string;
  jurisdiction?: string;
  incorporatedOn?: string;
  dissolvedOn?: string;
  sicCodes: string[];
  registeredOfficeAddress?: MappedAddress;
  accounts?: MappedCompanyAccounts;
  confirmationStatement?: MappedConfirmationStatement;
  previousNames: MappedPreviousCompanyName[];
  links?: ProviderRecord;
  record: ProviderRecord;
};

export type MappedOfficer = {
  officerId?: string;
  officerType?: string;
  name?: string;
  role?: string;
  appointedOn?: string;
  resignedOn?: string;
  dateOfBirth?: unknown;
  address?: MappedAddress;
  record: ProviderRecord;
};

export type MappedFiling = {
  transactionId?: string;
  documentId?: string;
  category?: string;
  date?: string;
  description?: string;
  type?: string;
  pages?: number;
  paperFiled?: boolean;
  record: ProviderRecord;
};

export type MappedCharge = {
  chargeId?: string;
  status?: string;
  createdOn?: string;
  deliveredOn?: string;
  satisfiedOn?: string;
  classification?: string;
  record: ProviderRecord;
};

export type MappedPsc = {
  pscId?: string;
  companyNumber?: string;
  name?: string;
  kind?: string;
  notifiedOn?: string;
  ceasedOn?: string;
  ceased?: boolean;
  naturesOfControl?: string[];
  record: ProviderRecord;
};

export type MappedPage<T> = {
  items: T[];
  itemsPerPage: number;
  startIndex: number;
  totalResults: number;
  record: ProviderRecord;
};

export type MappedDocumentResource = {
  contentLength?: number;
  createdAt?: string;
  updatedAt?: string;
  record: ProviderRecord;
};

export type MappedDocumentMetadata = {
  documentId?: string;
  createdAt?: string;
  updatedAt?: string;
  pages?: number;
  availableMimeTypes: string[];
  resources: Record<string, MappedDocumentResource>;
  record: ProviderRecord;
};
