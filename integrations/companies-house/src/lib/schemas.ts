import { z } from 'zod';
import {
  DEFAULT_ITEMS_PER_PAGE,
  MAX_ITEMS_PER_PAGE,
  SAFE_DOCUMENT_MIME_EXTENSIONS
} from './constants';

export const trimmedStringSchema = z.string().trim().min(1);
export const querySchema = trimmedStringSchema.max(200);
export const companyNumberSchema = trimmedStringSchema.max(32);
export const officerIdSchema = trimmedStringSchema.max(256);
export const documentIdSchema = trimmedStringSchema.max(256);
export const transactionIdSchema = trimmedStringSchema.max(256);
export const chargeIdSchema = trimmedStringSchema.max(256);

export const itemsPerPageSchema = z
  .number()
  .int()
  .min(1)
  .max(MAX_ITEMS_PER_PAGE)
  .default(DEFAULT_ITEMS_PER_PAGE);
export const startIndexSchema = z.number().int().min(0).default(0);

export const paginationFields = {
  itemsPerPage: itemsPerPageSchema,
  startIndex: startIndexSchema
};
export const paginationSchema = z.object(paginationFields);

export const isoDateSchema = z.iso.date();

export const documentMimeTypeSchema = z.enum(
  Object.keys(SAFE_DOCUMENT_MIME_EXTENSIONS) as [
    keyof typeof SAFE_DOCUMENT_MIME_EXTENSIONS,
    ...(keyof typeof SAFE_DOCUMENT_MIME_EXTENSIONS)[]
  ]
);

export const providerRecordSchema = z.record(z.string(), z.unknown());

export const mappedAddressSchema = z.object({
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  careOf: z.string().optional(),
  country: z.string().optional(),
  locality: z.string().optional(),
  poBox: z.string().optional(),
  postalCode: z.string().optional(),
  premises: z.string().optional(),
  region: z.string().optional(),
  record: providerRecordSchema
});

export const companySearchItemSchema = z.object({
  companyNumber: z.string(),
  name: z.string(),
  status: z.string().optional(),
  type: z.string().optional(),
  incorporatedOn: z.string().optional(),
  dissolvedOn: z.string().optional(),
  addressSnippet: z.string().optional(),
  profileUrl: z.string().optional(),
  record: providerRecordSchema
});

export const companySearchOutputSchema = z.object({
  items: z.array(companySearchItemSchema),
  itemsPerPage: z.number().int().nonnegative(),
  startIndex: z.number().int().nonnegative(),
  totalResults: z.number().int().nonnegative(),
  record: providerRecordSchema
});

const datedRecordSchema = z
  .object({
    dueOn: z.string().optional(),
    madeUpTo: z.string().optional(),
    periodStartOn: z.string().optional(),
    periodEndOn: z.string().optional(),
    type: z.string().optional(),
    overdue: z.boolean().optional(),
    record: providerRecordSchema
  })
  .passthrough();

export const companyAccountsSchema = z.object({
  accountingReferenceDate: z
    .object({
      day: z.number().int().optional(),
      month: z.number().int().optional(),
      record: providerRecordSchema
    })
    .optional(),
  lastAccounts: datedRecordSchema.optional(),
  nextAccounts: datedRecordSchema.optional(),
  nextDueOn: z.string().optional(),
  nextMadeUpTo: z.string().optional(),
  overdue: z.boolean().optional(),
  record: providerRecordSchema
});

export const confirmationStatementSchema = z.object({
  lastMadeUpTo: z.string().optional(),
  nextDueOn: z.string().optional(),
  nextMadeUpTo: z.string().optional(),
  overdue: z.boolean().optional(),
  record: providerRecordSchema
});

export const previousCompanyNameSchema = z.object({
  name: z.string(),
  effectiveFrom: z.string().optional(),
  ceasedOn: z.string().optional(),
  record: providerRecordSchema
});

export const companyProfileOutputSchema = z.object({
  companyNumber: z.string(),
  name: z.string(),
  status: z.string().optional(),
  statusDetail: z.string().optional(),
  type: z.string().optional(),
  subtype: z.string().optional(),
  jurisdiction: z.string().optional(),
  incorporatedOn: z.string().optional(),
  dissolvedOn: z.string().optional(),
  sicCodes: z.array(z.string()),
  registeredOfficeAddress: mappedAddressSchema.optional(),
  accounts: companyAccountsSchema.optional(),
  confirmationStatement: confirmationStatementSchema.optional(),
  previousNames: z.array(previousCompanyNameSchema),
  links: providerRecordSchema.optional(),
  record: providerRecordSchema
});

export const publishedDateOfBirthSchema = z.union([
  z.string(),
  z
    .object({
      day: z.number().int().optional(),
      month: z.number().int().optional(),
      year: z.number().int().optional()
    })
    .passthrough()
]);

export const officerSearchItemSchema = z.object({
  officerId: z.string().optional(),
  name: z.string(),
  appointmentCount: z.number().int().nonnegative().optional(),
  dateOfBirth: publishedDateOfBirthSchema.optional(),
  addressSnippet: z.string().optional(),
  appointmentsUrl: z.string().optional(),
  record: providerRecordSchema
});

export const officerSearchOutputSchema = z.object({
  items: z.array(officerSearchItemSchema),
  itemsPerPage: z.number().int().nonnegative(),
  startIndex: z.number().int().nonnegative(),
  totalResults: z.number().int().nonnegative(),
  record: providerRecordSchema
});

export const companyOfficerSchema = z.object({
  officerId: z.string().optional(),
  name: z.string(),
  role: z.string(),
  appointedOn: z.string().optional(),
  resignedOn: z.string().optional(),
  nationality: z.string().optional(),
  occupation: z.string().optional(),
  countryOfResidence: z.string().optional(),
  address: mappedAddressSchema.optional(),
  dateOfBirth: publishedDateOfBirthSchema.optional(),
  links: providerRecordSchema.optional(),
  record: providerRecordSchema
});

export const companyOfficerListOutputSchema = z.object({
  companyNumber: z.string(),
  activeCount: z.number().int().nonnegative(),
  resignedCount: z.number().int().nonnegative(),
  officers: z.array(companyOfficerSchema),
  itemsPerPage: z.number().int().nonnegative(),
  startIndex: z.number().int().nonnegative(),
  totalResults: z.number().int().nonnegative(),
  record: providerRecordSchema
});

export const officerAppointmentSchema = z.object({
  companyNumber: z.string(),
  companyName: z.string().optional(),
  companyStatus: z.string().optional(),
  role: z.string().optional(),
  appointedOn: z.string().optional(),
  resignedOn: z.string().optional(),
  links: providerRecordSchema.optional(),
  record: providerRecordSchema
});

export const officerAppointmentListOutputSchema = z.object({
  officerId: z.string(),
  name: z.string(),
  dateOfBirth: publishedDateOfBirthSchema.optional(),
  appointments: z.array(officerAppointmentSchema),
  itemsPerPage: z.number().int().nonnegative(),
  startIndex: z.number().int().nonnegative(),
  totalResults: z.number().int().nonnegative(),
  record: providerRecordSchema
});

export const disqualifiedOfficerSearchItemSchema = z.object({
  officerId: z.string().optional(),
  officerType: z.string().optional(),
  name: z.string(),
  addressSnippet: z.string().optional(),
  disqualificationsUrl: z.string().optional(),
  record: providerRecordSchema
});

export const disqualifiedOfficerSearchOutputSchema = z.object({
  items: z.array(disqualifiedOfficerSearchItemSchema),
  itemsPerPage: z.number().int().nonnegative(),
  startIndex: z.number().int().nonnegative(),
  totalResults: z.number().int().nonnegative(),
  record: providerRecordSchema
});

export const disqualificationVariationSchema = z.object({
  caseIdentifier: z.string().optional(),
  courtName: z.string().optional(),
  variedOn: z.string().optional(),
  record: providerRecordSchema
});

export const disqualificationReasonSchema = z.object({
  act: z.string(),
  article: z.string().optional(),
  descriptionIdentifier: z.string(),
  section: z.string().optional(),
  record: providerRecordSchema
});

export const disqualificationSchema = z.object({
  address: mappedAddressSchema,
  caseIdentifier: z.string().optional(),
  companyNames: z.array(z.string()).optional(),
  courtName: z.string().optional(),
  disqualificationType: z.string(),
  disqualifiedFrom: z.string(),
  disqualifiedUntil: z.string(),
  heardOn: z.string().optional(),
  undertakenOn: z.string().optional(),
  lastVariations: z.array(disqualificationVariationSchema).optional(),
  reason: disqualificationReasonSchema,
  record: providerRecordSchema
});

export const permissionToActSchema = z.object({
  companyNames: z.array(z.string()).optional(),
  courtName: z.string().optional(),
  expiresOn: z.string(),
  grantedOn: z.string(),
  record: providerRecordSchema
});

export const officerDisqualificationsOutputSchema = z.object({
  officerId: z.string(),
  officerType: z.string(),
  name: z.string(),
  personNumber: z.string().optional(),
  companyNumber: z.string().optional(),
  countryOfRegistration: z.string().optional(),
  forename: z.string().optional(),
  otherForenames: z.string().optional(),
  surname: z.string().optional(),
  title: z.string().optional(),
  honours: z.string().optional(),
  dateOfBirth: publishedDateOfBirthSchema.optional(),
  nationality: z.string().optional(),
  disqualifications: z.array(disqualificationSchema),
  permissionsToAct: z.array(permissionToActSchema),
  links: providerRecordSchema,
  record: providerRecordSchema
});

export const filingAnnotationSchema = z.object({
  annotation: z.string().optional(),
  date: z.string().optional(),
  description: z.string().optional(),
  record: providerRecordSchema
});

export const associatedFilingSchema = z.object({
  date: z.string().optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  record: providerRecordSchema
});

export const filingResolutionSchema = z.object({
  category: z.string().optional(),
  description: z.string().optional(),
  documentId: z.string().optional(),
  receivedOn: z.string().optional(),
  subcategory: z.string().optional(),
  type: z.string().optional(),
  record: providerRecordSchema
});

export const filingSchema = z.object({
  transactionId: z.string(),
  documentId: z.string().optional(),
  barcode: z.string().optional(),
  category: z.string(),
  subcategory: z.string().optional(),
  date: z.string(),
  description: z.string(),
  type: z.string(),
  pages: z.number().int().nonnegative().optional(),
  paperFiled: z.boolean().optional(),
  annotations: z.array(filingAnnotationSchema).optional(),
  associatedFilings: z.array(associatedFilingSchema).optional(),
  resolutions: z.array(filingResolutionSchema).optional(),
  links: providerRecordSchema.optional(),
  record: providerRecordSchema
});

export const filingHistoryOutputSchema = z.object({
  companyNumber: z.string(),
  filingHistoryStatus: z.string().optional(),
  filings: z.array(filingSchema),
  itemsPerPage: z.number().int().nonnegative(),
  startIndex: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
  record: providerRecordSchema
});

export const filingHistoryItemOutputSchema = filingSchema.extend({
  companyNumber: z.string()
});

export const documentContentTypeSchema = z.object({
  mimeType: z.string(),
  contentLength: z.number().int().nonnegative().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  record: providerRecordSchema
});

export const documentMetadataOutputSchema = z.object({
  documentId: z.string(),
  companyNumber: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  pages: z.number().int().nonnegative().optional(),
  availableContentTypes: z.array(documentContentTypeSchema),
  links: providerRecordSchema.optional(),
  record: providerRecordSchema
});

export const downloadedDocumentOutputSchema = z.object({
  documentId: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  byteLength: z.number().int().nonnegative()
});

export const addressSchema = z
  .object({
    address_line_1: z.string().optional(),
    address_line_2: z.string().optional(),
    care_of: z.string().optional(),
    country: z.string().optional(),
    locality: z.string().optional(),
    po_box: z.string().optional(),
    postal_code: z.string().optional(),
    premises: z.string().optional(),
    region: z.string().optional()
  })
  .passthrough();

export const linksSchema = z
  .object({
    appointments: z.string().optional(),
    company_profile: z.string().optional(),
    document: z.string().optional(),
    document_metadata: z.string().optional(),
    self: z.string().optional()
  })
  .passthrough();

export const companyRecordSchema = z
  .object({
    company_name: z.string().optional(),
    company_number: z.string().optional(),
    company_status: z.string().optional(),
    company_subtype: z.string().optional(),
    company_type: z.string().optional(),
    date_of_cessation: z.string().optional(),
    date_of_creation: z.string().optional(),
    title: z.string().optional(),
    address: addressSchema.optional(),
    registered_office_address: addressSchema.optional(),
    links: linksSchema.optional()
  })
  .passthrough();

export const officerRecordSchema = z
  .object({
    name: z.string().optional(),
    title: z.string().optional(),
    officer_role: z.string().optional(),
    appointed_on: z.string().optional(),
    resigned_on: z.string().optional(),
    address: addressSchema.optional(),
    links: linksSchema.optional()
  })
  .passthrough();

export const filingRecordSchema = z
  .object({
    transaction_id: z.string(),
    annotations: z.array(providerRecordSchema).optional(),
    associated_filings: z.array(providerRecordSchema).optional(),
    barcode: z.string().optional(),
    category: z.string(),
    date: z.string(),
    description: z.string(),
    pages: z.number().optional(),
    paper_filed: z.boolean().optional(),
    resolutions: z.array(providerRecordSchema).optional(),
    subcategory: z.string().optional(),
    type: z.string(),
    links: linksSchema.optional()
  })
  .passthrough();

export const chargeRecordSchema = z
  .object({
    id: z.string().optional(),
    status: z.string().optional(),
    created_on: z.string().optional(),
    delivered_on: z.string().optional(),
    satisfied_on: z.string().optional(),
    links: linksSchema.optional()
  })
  .passthrough();

export const pscRecordSchema = z
  .object({
    name: z.string().optional(),
    kind: z.string().optional(),
    notified_on: z.string().optional(),
    ceased_on: z.string().optional(),
    ceased: z.boolean().optional(),
    natures_of_control: z.array(z.string()).optional(),
    links: linksSchema.optional()
  })
  .passthrough();

export const documentMetadataSchema = z
  .object({
    id: z.string(),
    company_number: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string().optional(),
    pages: z.number().optional(),
    links: linksSchema,
    resources: z.record(z.string(), providerRecordSchema).optional()
  })
  .passthrough();

export const providerEnvelopeSchema = z
  .object({
    items: z.array(providerRecordSchema).optional(),
    items_per_page: z.number().optional(),
    start_index: z.number().optional(),
    total_count: z.number().optional(),
    total_results: z.number().optional()
  })
  .passthrough();

export const advancedCompanySearchEnvelopeSchema = z
  .object({
    hits: z.string(),
    items: z.array(providerRecordSchema).optional(),
    top_hit: providerRecordSchema.optional()
  })
  .passthrough();
