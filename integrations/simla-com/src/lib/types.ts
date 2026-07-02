// Shared types for Simla.com API responses

export interface PaginationResponse {
  limit: number;
  totalCount: number;
  currentPage: number;
  totalPageCount: number;
}

export interface SimlaAddress {
  index?: string;
  countryIso?: string;
  region?: string;
  regionId?: number;
  city?: string;
  cityId?: number;
  cityType?: string;
  street?: string;
  streetId?: number;
  streetType?: string;
  building?: string;
  flat?: string;
  floor?: number;
  block?: number;
  house?: string;
  housing?: string;
  metro?: string;
  notes?: string;
  text?: string;
}

export interface SimlaCustomer {
  id?: number;
  externalId?: string;
  firstName?: string;
  lastName?: string;
  patronymic?: string;
  email?: string;
  phones?: Array<{ number?: string }>;
  address?: SimlaAddress;
  createdAt?: string;
  managerId?: number;
  vip?: boolean;
  bad?: boolean;
  site?: string;
  contragent?: {
    contragentType?: string;
    legalName?: string;
    legalAddress?: string;
    INN?: string;
    OKPO?: string;
    KPP?: string;
    OGRN?: string;
    OGRNIP?: string;
    certificateNumber?: string;
    certificateDate?: string;
    BIK?: string;
    bank?: string;
    bankAddress?: string;
    corrAccount?: string;
    bankAccount?: string;
  };
  tags?: Array<{ name?: string; color?: string }>;
  customFields?: Record<string, any>;
  personalDiscount?: number;
  cumulativeDiscount?: number;
  sex?: string;
  birthday?: string;
  source?: {
    source?: string;
    medium?: string;
    campaign?: string;
    keyword?: string;
    content?: string;
  };
  segments?: Array<{ id?: number; code?: string; name?: string }>;
  type?: string;
  [key: string]: any;
}

export interface SimlaCorporateCustomer {
  id?: number;
  externalId?: string;
  nickName?: string;
  createdAt?: string;
  managerId?: number;
  vip?: boolean;
  bad?: boolean;
  site?: string;
  tags?: Array<{ name?: string; color?: string }>;
  customFields?: Record<string, any>;
  personalDiscount?: number;
  source?: {
    source?: string;
    medium?: string;
    campaign?: string;
    keyword?: string;
    content?: string;
  };
  type?: string;
  companies?: Array<{
    id?: number;
    isMain?: boolean;
    externalId?: string;
    active?: boolean;
    name?: string;
    brand?: string;
    site?: string;
    contragent?: Record<string, any>;
    address?: SimlaAddress;
  }>;
  addresses?: SimlaAddress[];
  contacts?: Array<{
    id?: number;
    isMain?: boolean;
    customer?: { id?: number; externalId?: string; site?: string };
  }>;
  [key: string]: any;
}

export interface SimlaOrderItem {
  id?: number;
  initialPrice?: number;
  discountManualAmount?: number;
  discountManualPercent?: number;
  quantity?: number;
  status?: string;
  offer?: {
    id?: number;
    externalId?: string;
    xmlId?: string;
    displayName?: string;
    name?: string;
    article?: string;
    unit?: { code?: string; name?: string; sym?: string };
  };
  properties?: Record<string, any>;
  vatRate?: string;
  comment?: string;
  [key: string]: any;
}

export interface SimlaPayment {
  id?: number;
  externalId?: string;
  type?: string;
  status?: string;
  amount?: number;
  paidAt?: string;
  comment?: string;
  [key: string]: any;
}

export interface SimlaDelivery {
  code?: string;
  integrationCode?: string;
  cost?: number;
  netCost?: number;
  date?: string;
  time?: { from?: string; to?: string };
  address?: SimlaAddress;
  service?: { name?: string; code?: string; active?: boolean };
  [key: string]: any;
}

export interface SimlaOrder {
  id?: number;
  externalId?: string;
  number?: string;
  firstName?: string;
  lastName?: string;
  patronymic?: string;
  phone?: string;
  additionalPhone?: string;
  email?: string;
  customer?: { id?: number; externalId?: string; site?: string; type?: string };
  orderType?: string;
  orderMethod?: string;
  createdAt?: string;
  statusUpdatedAt?: string;
  totalSumm?: number;
  prepaySum?: number;
  purchaseSumm?: number;
  markDatetime?: string;
  site?: string;
  status?: string;
  statusComment?: string;
  source?: {
    source?: string;
    medium?: string;
    campaign?: string;
    keyword?: string;
    content?: string;
  };
  items?: SimlaOrderItem[];
  delivery?: SimlaDelivery;
  payments?: Record<string, SimlaPayment>;
  managerId?: number;
  customFields?: Record<string, any>;
  contragent?: Record<string, any>;
  shipmentDate?: string;
  shipped?: boolean;
  discountManualAmount?: number;
  discountManualPercent?: number;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  customerComment?: string;
  managerComment?: string;
  tags?: Array<{ name?: string; color?: string }>;
  [key: string]: any;
}

export interface SimlaProduct {
  id?: number;
  article?: string;
  name?: string;
  url?: string;
  imageUrl?: string;
  description?: string;
  popular?: boolean;
  stock?: boolean;
  novelty?: boolean;
  recommended?: boolean;
  active?: boolean;
  quantity?: number;
  markable?: boolean;
  groups?: Array<{ id?: number; externalId?: string; name?: string }>;
  properties?: Record<string, any>;
  offers?: Array<{
    id?: number;
    externalId?: string;
    xmlId?: string;
    name?: string;
    article?: string;
    barcode?: string;
    price?: number;
    purchasePrice?: number;
    quantity?: number;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    images?: string[];
    unit?: { code?: string; name?: string; sym?: string };
    properties?: Record<string, any>;
    [key: string]: any;
  }>;
  [key: string]: any;
}

export interface SimlaHistoryEntry {
  id?: number;
  createdAt?: string;
  created?: boolean;
  deleted?: boolean;
  source?: string;
  field?: string;
  oldValue?: any;
  newValue?: any;
  apiKey?: { current?: boolean };
  user?: { id?: number };
  order?: SimlaOrder;
  customer?: SimlaCustomer;
  corporateCustomer?: SimlaCorporateCustomer;
  [key: string]: any;
}

export interface SimlaNote {
  id?: number;
  managerId?: number;
  text?: string;
  createdAt?: string;
  customer?: { id?: number; externalId?: string; site?: string };
  [key: string]: any;
}

export interface SimlaSegment {
  id?: number;
  code?: string;
  name?: string;
  createdAt?: string;
  isDynamic?: boolean;
  customersCount?: number;
  active?: boolean;
  [key: string]: any;
}

export interface SimlaUser {
  id?: number;
  firstName?: string;
  lastName?: string;
  patronymic?: string;
  email?: string;
  phone?: string;
  status?: string;
  online?: boolean;
  isAdmin?: boolean;
  isManager?: boolean;
  groups?: Array<{ id?: number; name?: string; code?: string }>;
  [key: string]: any;
}

export interface SimlaTask {
  id?: number;
  text?: string;
  commentary?: string;
  datetime?: string;
  createdAt?: string;
  complete?: boolean;
  performerId?: number;
  performer?: number;
  customer?: { id?: number; externalId?: string; site?: string };
  order?: { id?: number; externalId?: string; site?: string };
  [key: string]: any;
}
