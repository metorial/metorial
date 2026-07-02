// Xero API response types

export interface XeroContact {
  ContactID?: string;
  ContactNumber?: string;
  AccountNumber?: string;
  ContactStatus?: string;
  Name?: string;
  FirstName?: string;
  LastName?: string;
  EmailAddress?: string;
  BankAccountDetails?: string;
  TaxNumber?: string;
  AccountsReceivableTaxType?: string;
  AccountsPayableTaxType?: string;
  Addresses?: Array<{
    AddressType?: string;
    AddressLine1?: string;
    AddressLine2?: string;
    AddressLine3?: string;
    AddressLine4?: string;
    City?: string;
    Region?: string;
    PostalCode?: string;
    Country?: string;
    AttentionTo?: string;
  }>;
  Phones?: Array<{
    PhoneType?: string;
    PhoneNumber?: string;
    PhoneAreaCode?: string;
    PhoneCountryCode?: string;
  }>;
  IsSupplier?: boolean;
  IsCustomer?: boolean;
  DefaultCurrency?: string;
  UpdatedDateUTC?: string;
  ContactPersons?: Array<{
    FirstName?: string;
    LastName?: string;
    EmailAddress?: string;
    IncludeInEmails?: boolean;
  }>;
  HasAttachments?: boolean;
  HasValidationErrors?: boolean;
  PaymentTerms?: {
    Bills?: { Day?: number; Type?: string };
    Sales?: { Day?: number; Type?: string };
  };
  ContactGroups?: Array<{
    ContactGroupID?: string;
    Name?: string;
  }>;
  Website?: string;
  Discount?: number;
}

export interface XeroContactGroup {
  ContactGroupID?: string;
  Name?: string;
  Status?: string;
  Contacts?: XeroContact[];
  HasValidationErrors?: boolean;
  ValidationErrors?: Array<{ Message?: string }>;
}

export interface XeroLineItem {
  LineItemID?: string;
  Description?: string;
  Quantity?: number;
  UnitAmount?: number;
  ItemCode?: string;
  AccountCode?: string;
  TaxType?: string;
  TaxAmount?: number;
  LineAmount?: number;
  DiscountRate?: number;
  DiscountAmount?: number;
  Tracking?: Array<{
    Name?: string;
    Option?: string;
    TrackingCategoryID?: string;
    TrackingOptionID?: string;
  }>;
}

export interface XeroInvoice {
  InvoiceID?: string;
  InvoiceNumber?: string;
  Reference?: string;
  Type?: string;
  Status?: string;
  Contact?: { ContactID?: string; Name?: string };
  DateString?: string;
  Date?: string;
  DueDateString?: string;
  DueDate?: string;
  LineAmountTypes?: string;
  LineItems?: XeroLineItem[];
  SubTotal?: number;
  TotalTax?: number;
  Total?: number;
  AmountDue?: number;
  AmountPaid?: number;
  AmountCredited?: number;
  CurrencyCode?: string;
  CurrencyRate?: number;
  UpdatedDateUTC?: string;
  BrandingThemeID?: string;
  Url?: string;
  SentToContact?: boolean;
  ExpectedPaymentDate?: string;
  PlannedPaymentDate?: string;
  HasAttachments?: boolean;
  Payments?: Array<{
    PaymentID?: string;
    Date?: string;
    Amount?: number;
    Reference?: string;
  }>;
  CreditNotes?: Array<{
    CreditNoteID?: string;
    CreditNoteNumber?: string;
    AppliedAmount?: number;
  }>;
  Prepayments?: any[];
  Overpayments?: any[];
  HasErrors?: boolean;
}

export interface XeroCreditNote {
  CreditNoteID?: string;
  CreditNoteNumber?: string;
  Type?: string;
  Status?: string;
  Contact?: { ContactID?: string; Name?: string };
  DateString?: string;
  Date?: string;
  LineAmountTypes?: string;
  LineItems?: XeroLineItem[];
  SubTotal?: number;
  TotalTax?: number;
  Total?: number;
  CurrencyCode?: string;
  CurrencyRate?: number;
  UpdatedDateUTC?: string;
  RemainingCredit?: number;
  Allocations?: Array<{
    Amount?: number;
    Date?: string;
    Invoice?: { InvoiceID?: string; InvoiceNumber?: string };
  }>;
  HasAttachments?: boolean;
}

export interface XeroPayment {
  PaymentID?: string;
  Date?: string;
  Amount?: number;
  CurrencyRate?: number;
  Reference?: string;
  IsReconciled?: boolean;
  Status?: string;
  PaymentType?: string;
  UpdatedDateUTC?: string;
  Account?: { AccountID?: string; Code?: string };
  Invoice?: { InvoiceID?: string; InvoiceNumber?: string; Type?: string };
  CreditNote?: { CreditNoteID?: string; CreditNoteNumber?: string };
  BankAmount?: number;
}

export interface XeroBankTransaction {
  BankTransactionID?: string;
  Type?: string;
  Contact?: { ContactID?: string; Name?: string };
  LineItems?: XeroLineItem[];
  BankAccount?: { AccountID?: string; Code?: string; Name?: string };
  IsReconciled?: boolean;
  Date?: string;
  Reference?: string;
  CurrencyCode?: string;
  CurrencyRate?: number;
  Url?: string;
  Status?: string;
  LineAmountTypes?: string;
  SubTotal?: number;
  TotalTax?: number;
  Total?: number;
  UpdatedDateUTC?: string;
  HasAttachments?: boolean;
}

export interface XeroBankTransfer {
  BankTransferID?: string;
  FromBankAccount?: { AccountID?: string; Code?: string; Name?: string };
  ToBankAccount?: { AccountID?: string; Code?: string; Name?: string };
  Amount?: number;
  DateString?: string;
  Date?: string;
  Reference?: string;
  CurrencyRate?: number;
  FromBankTransactionID?: string;
  ToBankTransactionID?: string;
  FromIsReconciled?: boolean;
  ToIsReconciled?: boolean;
  HasAttachments?: boolean;
  CreatedDateUTC?: string;
}

export interface XeroAccount {
  AccountID?: string;
  Code?: string;
  Name?: string;
  Type?: string;
  BankAccountNumber?: string;
  Status?: string;
  Description?: string;
  BankAccountType?: string;
  CurrencyCode?: string;
  TaxType?: string;
  EnablePaymentsToAccount?: boolean;
  ShowInExpenseClaims?: boolean;
  Class?: string;
  SystemAccount?: string;
  ReportingCode?: string;
  ReportingCodeName?: string;
  HasAttachments?: boolean;
  UpdatedDateUTC?: string;
  AddToWatchlist?: boolean;
}

export interface XeroPurchaseOrder {
  PurchaseOrderID?: string;
  PurchaseOrderNumber?: string;
  DateString?: string;
  Date?: string;
  DeliveryDateString?: string;
  DeliveryDate?: string;
  DeliveryAddress?: string;
  AttentionTo?: string;
  Telephone?: string;
  DeliveryInstructions?: string;
  Reference?: string;
  Status?: string;
  LineAmountTypes?: string;
  LineItems?: XeroLineItem[];
  SubTotal?: number;
  TotalTax?: number;
  Total?: number;
  CurrencyCode?: string;
  CurrencyRate?: number;
  Contact?: { ContactID?: string; Name?: string };
  UpdatedDateUTC?: string;
  HasAttachments?: boolean;
  SentToContact?: boolean;
}

export interface XeroQuote {
  QuoteID?: string;
  QuoteNumber?: string;
  Reference?: string;
  Terms?: string;
  Status?: string;
  Contact?: { ContactID?: string; Name?: string };
  DateString?: string;
  Date?: string;
  ExpiryDateString?: string;
  ExpiryDate?: string;
  LineAmountTypes?: string;
  LineItems?: XeroLineItem[];
  SubTotal?: number;
  TotalTax?: number;
  Total?: number;
  CurrencyCode?: string;
  Title?: string;
  Summary?: string;
  UpdatedDateUTC?: string;
}

export interface XeroOrganisation {
  OrganisationID?: string;
  APIKey?: string;
  Name?: string;
  LegalName?: string;
  PaysTax?: boolean;
  Version?: string;
  OrganisationType?: string;
  BaseCurrency?: string;
  CountryCode?: string;
  IsDemoCompany?: boolean;
  OrganisationStatus?: string;
  FinancialYearEndDay?: number;
  FinancialYearEndMonth?: number;
  SalesTaxBasis?: string;
  SalesTaxPeriod?: string;
  DefaultSalesTax?: string;
  DefaultPurchasesTax?: string;
  CreatedDateUTC?: string;
  Timezone?: string;
  OrganisationEntityType?: string;
  ShortCode?: string;
  LineOfBusiness?: string;
  Addresses?: Array<{
    AddressType?: string;
    AddressLine1?: string;
    City?: string;
    Region?: string;
    PostalCode?: string;
    Country?: string;
  }>;
  Phones?: Array<{
    PhoneType?: string;
    PhoneNumber?: string;
    PhoneAreaCode?: string;
    PhoneCountryCode?: string;
  }>;
  Edition?: string;
  Class?: string;
}

export interface XeroTaxRate {
  Name?: string;
  TaxType?: string;
  ReportTaxType?: string;
  CanApplyToAssets?: boolean;
  CanApplyToEquity?: boolean;
  CanApplyToExpenses?: boolean;
  CanApplyToLiabilities?: boolean;
  CanApplyToRevenue?: boolean;
  DisplayTaxRate?: number;
  EffectiveRate?: number;
  Status?: string;
  TaxComponents?: Array<{
    Name?: string;
    Rate?: number;
    IsCompound?: boolean;
    IsNonRecoverable?: boolean;
  }>;
}

export interface XeroTrackingCategory {
  TrackingCategoryID?: string;
  Name?: string;
  Status?: string;
  Options?: Array<{
    TrackingOptionID?: string;
    Name?: string;
    Status?: string;
  }>;
}

export interface XeroManualJournal {
  ManualJournalID?: string;
  Date?: string;
  Status?: string;
  LineAmountTypes?: string;
  Narration?: string;
  JournalLines?: Array<{
    LineAmount?: number;
    AccountCode?: string;
    Description?: string;
    TaxType?: string;
    Tracking?: Array<{
      Name?: string;
      Option?: string;
      TrackingCategoryID?: string;
      TrackingOptionID?: string;
    }>;
  }>;
  Url?: string;
  ShowOnCashBasisReports?: boolean;
  HasAttachments?: boolean;
  UpdatedDateUTC?: string;
}

export interface XeroItem {
  ItemID?: string;
  Code?: string;
  Name?: string;
  Description?: string;
  PurchaseDescription?: string;
  PurchaseDetails?: {
    UnitPrice?: number;
    AccountCode?: string;
    COGSAccountCode?: string;
    TaxType?: string;
  };
  SalesDetails?: {
    UnitPrice?: number;
    AccountCode?: string;
    TaxType?: string;
  };
  IsTrackedAsInventory?: boolean;
  InventoryAssetAccountCode?: string;
  TotalCostPool?: number;
  QuantityOnHand?: number;
  IsSold?: boolean;
  IsPurchased?: boolean;
  UpdatedDateUTC?: string;
}

export interface XeroCurrency {
  Code?: string;
  Description?: string;
}

export interface XeroBrandingTheme {
  BrandingThemeID?: string;
  Name?: string;
  LogoUrl?: string;
  Type?: string;
  SortOrder?: number;
  CreatedDateUTC?: string;
}

export interface XeroReport {
  ReportID?: string;
  ReportName?: string;
  ReportType?: string;
  ReportTitle?: string;
  ReportDate?: string;
  UpdatedDateUTC?: string;
  Rows?: Array<{
    RowType?: string;
    Title?: string;
    Cells?: Array<{
      Value?: string;
      Attributes?: Array<{ Value?: string; Id?: string }>;
    }>;
    Rows?: Array<{
      RowType?: string;
      Cells?: Array<{
        Value?: string;
        Attributes?: Array<{ Value?: string; Id?: string }>;
      }>;
    }>;
  }>;
}
