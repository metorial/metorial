export interface FirmaoListParams {
  start?: number;
  limit?: number;
  sort?: string;
  dir?: 'ASC' | 'DESC';
  filters?: Record<string, string>;
}

export interface FirmaoListResponse<T> {
  data: T[];
  totalSize: number;
}

export interface FirmaoCustomer {
  id: number;
  name: string;
  label?: string;
  customerType?: string;
  nipNumber?: string;
  bankAccountNumber?: string;
  emails?: string[];
  phones?: string[];
  website?: string;
  description?: string;
  ownership?: string;
  employeesNumber?: number;
  industry?: { key: string; label?: string };
  officeAddress?: FirmaoAddress;
  correspondenceAddress?: FirmaoAddress;
  tags?: FirmaoTag[];
  customFields?: Record<string, string>;
  deleted?: boolean;
  creationDate?: string;
  lastModificationDate?: string;
  [key: string]: any;
}

export interface FirmaoAddress {
  street?: string;
  city?: string;
  postCode?: string;
  country?: string;
  state?: string;
}

export interface FirmaoTag {
  id?: number;
  name?: string;
}

export interface FirmaoContact {
  id: number;
  firstName?: string;
  lastName?: string;
  label?: string;
  customer?: number | { id: number; name?: string };
  position?: string;
  department?: string;
  emails?: string[];
  phones?: string[];
  tags?: FirmaoTag[];
  customFields?: Record<string, string>;
  deleted?: boolean;
  creationDate?: string;
  lastModificationDate?: string;
  [key: string]: any;
}

export interface FirmaoProject {
  id: number;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  teamMembers?: { id: number }[];
  managers?: { id: number }[];
  tags?: FirmaoTag[];
  budget?: number;
  status?: string;
  customFields?: Record<string, string>;
  deleted?: boolean;
  creationDate?: string;
  lastModificationDate?: string;
  [key: string]: any;
}

export interface FirmaoTask {
  id: number;
  name: string;
  taskType?: string;
  description?: string;
  priority?: string;
  status?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  plannedStartDateType?: string;
  plannedEndDateType?: string;
  estimatedHours?: number;
  responsibleUsers?: { id: number }[];
  project?: number | { id: number; name?: string };
  tags?: FirmaoTag[];
  customFields?: Record<string, string>;
  deleted?: boolean;
  creationDate?: string;
  lastModificationDate?: string;
  [key: string]: any;
}

export interface FirmaoTransactionEntry {
  product?: number;
  productCode?: string;
  productName?: string;
  quantity?: number;
  unit?: string;
  unitNettoPrice?: number;
  vatPercent?: number;
  discount?: number;
  baseEntryId?: number;
  [key: string]: any;
}

export interface FirmaoTransaction {
  id: number;
  type?: string;
  mode?: string;
  transactionNumber?: string;
  transactionDate?: string;
  invoiceDate?: string;
  paymentDate?: string;
  customer?: number | { id: number; name?: string };
  currency?: string;
  paymentType?: string;
  paid?: boolean;
  paidValue?: number;
  transactionNettoPrice?: number;
  transactionBruttoPrice?: number;
  transactionVatPrice?: number;
  transactionEntries?: FirmaoTransactionEntry[];
  connectedDocNumber?: string;
  connectedDocDate?: string;
  correctionCause?: string;
  customFields?: Record<string, string>;
  deleted?: boolean;
  creationDate?: string;
  lastModificationDate?: string;
  [key: string]: any;
}

export interface FirmaoOfferEntry {
  product?: number;
  productCode?: string;
  productName?: string;
  quantity?: number;
  unit?: string;
  unitNettoPrice?: number;
  vatPercent?: number;
  classificationNumber?: string;
  [key: string]: any;
}

export interface FirmaoOffer {
  id: number;
  type?: string;
  mode?: string;
  number?: string;
  offerDate?: string;
  validFrom?: string;
  paymentDate?: string;
  currency?: string;
  customer?: number | { id: number; name?: string };
  issuingPerson?: string;
  paymentType?: string;
  offerStatus?: string;
  daysToDueDate?: number;
  nettoPrice?: number;
  bruttoPrice?: number;
  vatPrice?: number;
  entries?: FirmaoOfferEntry[];
  customFields?: Record<string, string>;
  deleted?: boolean;
  creationDate?: string;
  lastModificationDate?: string;
  [key: string]: any;
}

export interface FirmaoProduct {
  id: number;
  name: string;
  productCode?: string;
  saleable?: boolean;
  purchasePriceGroup?: {
    netPrice?: number;
    grossPrice?: number;
    vat?: number;
  };
  salePriceGroup?: {
    netPrice?: number;
    grossPrice?: number;
    vat?: number;
  };
  currentStoreState?: number;
  unit?: string;
  tags?: FirmaoTag[];
  classificationNumber?: string;
  customFields?: Record<string, string>;
  deleted?: boolean;
  creationDate?: string;
  lastModificationDate?: string;
  [key: string]: any;
}

export interface FirmaoSalesOpportunity {
  id: number;
  label?: string;
  customer?: number | { id: number; name?: string };
  responsibleUser?: number | { id: number };
  acquisitionMethod?: string;
  sellingProcess?: string;
  salesDate?: string;
  salesOpportunityValue?: number;
  currency?: string;
  stage?: string;
  status?: string;
  tags?: FirmaoTag[];
  emails?: string[];
  phones?: string[];
  customFields?: Record<string, string>;
  deleted?: boolean;
  creationDate?: string;
  lastModificationDate?: string;
  [key: string]: any;
}

export interface FirmaoSalesNote {
  id: number;
  description?: string;
  type?: string;
  customer?: number | { id: number; name?: string };
  date?: string;
  tags?: FirmaoTag[];
  customFields?: Record<string, string>;
  deleted?: boolean;
  creationDate?: string;
  lastModificationDate?: string;
  [key: string]: any;
}

export interface FirmaoTimeEntry {
  id: number;
  type?: string;
  user?: number | { id: number };
  task?: number | { id: number };
  dateTimeFrom?: string;
  dateTimeTo?: string;
  description?: string;
  deleted?: boolean;
  creationDate?: string;
  lastModificationDate?: string;
  [key: string]: any;
}

export interface FirmaoEmail {
  id: number;
  subject?: string;
  from?: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  status?: string;
  box?: string;
  customer?: { id: number; name?: string };
  contact?: { id: number };
  project?: { id: number };
  creationDate?: string;
  [key: string]: any;
}

export interface FirmaoDocument {
  id: number;
  name?: string;
  description?: string;
  size?: number;
  creationDate?: string;
  [key: string]: any;
}

export interface FirmaoStorageDoc {
  id: number;
  type?: string;
  number?: string;
  customer?: number | { id: number; name?: string };
  warehouse?: { id: number; name?: string };
  entries?: any[];
  customFields?: Record<string, string>;
  deleted?: boolean;
  creationDate?: string;
  lastModificationDate?: string;
  [key: string]: any;
}

export interface FirmaoAgreement {
  id: number;
  number?: string;
  mode?: string;
  customer?: number | { id: number; name?: string };
  currency?: string;
  offerStatus?: string;
  entries?: FirmaoOfferEntry[];
  customFields?: Record<string, string>;
  deleted?: boolean;
  creationDate?: string;
  lastModificationDate?: string;
  [key: string]: any;
}
