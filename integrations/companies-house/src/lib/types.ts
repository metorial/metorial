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

export type PublishedDateOfBirth =
  | string
  | (ProviderRecord & {
      day?: number;
      month?: number;
      year?: number;
    });

export type MappedOfficerSearchItem = {
  officerId?: string;
  name: string;
  appointmentCount?: number;
  dateOfBirth?: PublishedDateOfBirth;
  addressSnippet?: string;
  appointmentsUrl?: string;
  record: ProviderRecord;
};

export type MappedCompanyOfficer = {
  officerId?: string;
  name: string;
  role: string;
  appointedOn?: string;
  resignedOn?: string;
  nationality?: string;
  occupation?: string;
  countryOfResidence?: string;
  address?: MappedAddress;
  dateOfBirth?: PublishedDateOfBirth;
  links?: ProviderRecord;
  record: ProviderRecord;
};

export type MappedCompanyOfficerList = {
  companyNumber: string;
  activeCount: number;
  resignedCount: number;
  officers: MappedCompanyOfficer[];
  itemsPerPage: number;
  startIndex: number;
  totalResults: number;
  record: ProviderRecord;
};

export type MappedOfficerAppointment = {
  companyNumber: string;
  companyName?: string;
  companyStatus?: string;
  role?: string;
  appointedOn?: string;
  resignedOn?: string;
  links?: ProviderRecord;
  record: ProviderRecord;
};

export type MappedOfficerAppointmentList = {
  officerId: string;
  name: string;
  dateOfBirth?: PublishedDateOfBirth;
  appointments: MappedOfficerAppointment[];
  itemsPerPage: number;
  startIndex: number;
  totalResults: number;
  record: ProviderRecord;
};

export type MappedDisqualifiedOfficerSearchItem = {
  officerId?: string;
  officerType?: string;
  name: string;
  addressSnippet?: string;
  disqualificationsUrl?: string;
  record: ProviderRecord;
};

export type MappedDisqualificationVariation = {
  caseIdentifier?: string;
  courtName?: string;
  variedOn?: string;
  record: ProviderRecord;
};

export type MappedDisqualificationReason = {
  act: string;
  article?: string;
  descriptionIdentifier: string;
  section?: string;
  record: ProviderRecord;
};

export type MappedDisqualification = {
  address: MappedAddress;
  caseIdentifier?: string;
  companyNames?: string[];
  courtName?: string;
  disqualificationType: string;
  disqualifiedFrom: string;
  disqualifiedUntil: string;
  heardOn?: string;
  undertakenOn?: string;
  lastVariations?: MappedDisqualificationVariation[];
  reason: MappedDisqualificationReason;
  record: ProviderRecord;
};

export type MappedPermissionToAct = {
  companyNames?: string[];
  courtName?: string;
  expiresOn: string;
  grantedOn: string;
  record: ProviderRecord;
};

export type MappedDisqualifiedOfficer = {
  officerId: string;
  officerType: string;
  name: string;
  personNumber?: string;
  companyNumber?: string;
  countryOfRegistration?: string;
  forename?: string;
  otherForenames?: string;
  surname?: string;
  title?: string;
  honours?: string;
  dateOfBirth?: PublishedDateOfBirth;
  nationality?: string;
  disqualifications: MappedDisqualification[];
  permissionsToAct: MappedPermissionToAct[];
  links: ProviderRecord;
  record: ProviderRecord;
};

export type MappedFilingAnnotation = {
  annotation?: string;
  date?: string;
  description?: string;
  record: ProviderRecord;
};

export type MappedAssociatedFiling = {
  date?: string;
  description?: string;
  type?: string;
  record: ProviderRecord;
};

export type MappedFilingResolution = {
  category?: string;
  description?: string;
  documentId?: string;
  receivedOn?: string;
  subcategory?: string;
  type?: string;
  record: ProviderRecord;
};

export type MappedFiling = {
  transactionId: string;
  documentId?: string;
  barcode?: string;
  category: string;
  subcategory?: string;
  date: string;
  description: string;
  type: string;
  pages?: number;
  paperFiled?: boolean;
  annotations?: MappedFilingAnnotation[];
  associatedFilings?: MappedAssociatedFiling[];
  resolutions?: MappedFilingResolution[];
  links?: ProviderRecord;
  record: ProviderRecord;
};

export type MappedFilingHistory = {
  companyNumber: string;
  filingHistoryStatus?: string;
  filings: MappedFiling[];
  itemsPerPage: number;
  startIndex: number;
  totalCount: number;
  record: ProviderRecord;
};

export type ProviderLinks = ProviderRecord | ProviderRecord[];

export type MappedChargeDescription = {
  description?: string;
  type?: string;
  record: ProviderRecord;
};

export type MappedChargeParticular = MappedChargeDescription & {
  chargorActingAsBareTrustee?: boolean;
  containsFixedCharge?: boolean;
  containsFloatingCharge?: boolean;
  containsNegativePledge?: boolean;
  floatingChargeCoversAll?: boolean;
};

export type MappedPersonEntitled = {
  name?: string;
  record: ProviderRecord;
};

export type MappedChargeTransaction = {
  deliveredOn?: string;
  filingType?: string;
  insolvencyCaseNumber?: string;
  links?: ProviderRecord[];
  record: ProviderRecord;
};

export type MappedChargeInsolvencyCase = {
  caseNumber?: string;
  links?: ProviderRecord[];
  record: ProviderRecord;
};

export type MappedCharge = {
  chargeId: string;
  chargeCode?: string;
  chargeNumber?: number;
  status: string;
  acquiredOn?: string;
  assetsCeasedReleased?: string;
  coveringInstrumentOn?: string;
  createdOn?: string;
  deliveredOn?: string;
  resolvedOn?: string;
  satisfiedOn?: string;
  classification: MappedChargeDescription[];
  securedDetails?: MappedChargeDescription[];
  particulars?: MappedChargeParticular[];
  personsEntitled?: MappedPersonEntitled[];
  moreThanFourPersonsEntitled?: boolean;
  transactions?: MappedChargeTransaction[];
  insolvencyCases?: MappedChargeInsolvencyCase[];
  links?: ProviderLinks;
  record: ProviderRecord;
};

export type MappedChargeList = {
  companyNumber: string;
  totalCount?: number;
  satisfiedCount?: number;
  partSatisfiedCount?: number;
  charges: MappedCharge[];
  itemsPerPage: number;
  startIndex: number;
  record: ProviderRecord;
};

export type MappedInsolvencyDate = {
  type: string;
  date: string;
  record: ProviderRecord;
};

export type MappedInsolvencyPractitioner = {
  name: string;
  addresses: MappedAddress[];
  appointedOn?: string;
  ceasedToActOn?: string;
  role?: string;
  record: ProviderRecord;
};

export type MappedInsolvencyCase = {
  type: string;
  number?: string;
  dates: MappedInsolvencyDate[];
  notes?: string[];
  practitioners: MappedInsolvencyPractitioner[];
  links?: ProviderRecord;
  record: ProviderRecord;
};

export type MappedCompanyInsolvency = {
  companyNumber: string;
  status?: string;
  cases: MappedInsolvencyCase[];
  record: ProviderRecord;
};

export type MappedPscIdentification = {
  legalAuthority?: string;
  legalForm?: string;
  placeRegistered?: string;
  registrationNumber?: string;
  countryRegistered?: string;
  record: ProviderRecord;
};

export type MappedPscIdentityVerification = {
  antiMoneyLaunderingSupervisoryBodies?: string[];
  appointmentVerificationEndOn?: string;
  appointmentVerificationStartOn?: string;
  appointmentVerificationStatementDate?: string;
  appointmentVerificationStatementDueOn?: string;
  authorisedCorporateServiceProviderName?: string;
  identityVerifiedOn?: string;
  preferredName?: string;
  record: ProviderRecord;
};

export type MappedPsc = {
  notificationId?: string;
  name?: string;
  kind?: string;
  description?: string;
  notifiedOn?: string;
  ceasedOn?: string;
  ceased?: boolean;
  naturesOfControl?: string[];
  nationality?: string;
  countryOfResidence?: string;
  address?: MappedAddress;
  principalOfficeAddress?: MappedAddress;
  dateOfBirth?: PublishedDateOfBirth;
  isSanctioned?: boolean;
  identification?: MappedPscIdentification;
  identityVerificationDetails?: MappedPscIdentityVerification;
  links?: ProviderRecord;
  record: ProviderRecord;
};

export type MappedPscList = {
  companyNumber: string;
  activeCount: number;
  ceasedCount: number;
  pscs: MappedPsc[];
  itemsPerPage: number;
  startIndex: number;
  totalResults: number;
  links?: ProviderRecord;
  record: ProviderRecord;
};

export type MappedPscStatement = {
  statementId?: string;
  kind: string;
  statement: string;
  notifiedOn: string;
  ceasedOn?: string;
  linkedPscName?: string;
  restrictionsNoticeWithdrawalReason?: string;
  links?: ProviderRecord;
  record: ProviderRecord;
};

export type MappedPscStatementList = {
  companyNumber: string;
  activeCount: number;
  ceasedCount: number;
  statements: MappedPscStatement[];
  itemsPerPage: number;
  startIndex: number;
  totalResults: number;
  links?: ProviderRecord;
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
  documentId: string;
  companyNumber?: string;
  createdAt?: string;
  updatedAt?: string;
  pages?: number;
  availableContentTypes: Array<MappedDocumentResource & { mimeType: string }>;
  links?: ProviderRecord;
  resources: Record<string, MappedDocumentResource>;
  record: ProviderRecord;
};
