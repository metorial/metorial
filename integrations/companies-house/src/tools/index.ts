export const companiesHouseToolKeys = [
  'search_companies',
  'search_companies_advanced',
  'get_company_profile',
  'search_officers',
  'list_company_officers',
  'list_officer_appointments',
  'search_disqualified_officers',
  'get_officer_disqualifications',
  'list_filing_history',
  'get_filing_history_item',
  'get_document_metadata',
  'download_filing_document',
  'list_company_charges',
  'get_company_charge',
  'get_company_insolvency',
  'list_company_pscs',
  'list_psc_statements'
] as const;

export { getCompanyCharge, listCompanyCharges } from './charges';
export { getCompanyProfile } from './company-profile';
export { getOfficerDisqualifications, searchDisqualifiedOfficers } from './disqualifications';
export { downloadFilingDocument, getDocumentMetadata } from './documents';
export { getFilingHistoryItem, listFilingHistory } from './filings';
export { getCompanyInsolvency } from './insolvency';
export { listCompanyOfficers, listOfficerAppointments, searchOfficers } from './officers';
export { listCompanyPscs, listPscStatements } from './psc';
export { searchCompanies, searchCompaniesAdvanced } from './search-companies';

import { getCompanyCharge, listCompanyCharges } from './charges';
import { getCompanyProfile } from './company-profile';
import { getOfficerDisqualifications, searchDisqualifiedOfficers } from './disqualifications';
import { downloadFilingDocument, getDocumentMetadata } from './documents';
import { getFilingHistoryItem, listFilingHistory } from './filings';
import { getCompanyInsolvency } from './insolvency';
import { listCompanyOfficers, listOfficerAppointments, searchOfficers } from './officers';
import { listCompanyPscs, listPscStatements } from './psc';
import { searchCompanies, searchCompaniesAdvanced } from './search-companies';

export const tools = [
  searchCompanies,
  searchCompaniesAdvanced,
  getCompanyProfile,
  searchOfficers,
  listCompanyOfficers,
  listOfficerAppointments,
  searchDisqualifiedOfficers,
  getOfficerDisqualifications,
  listFilingHistory,
  getFilingHistoryItem,
  getDocumentMetadata,
  downloadFilingDocument,
  listCompanyCharges,
  getCompanyCharge,
  getCompanyInsolvency,
  listCompanyPscs,
  listPscStatements
];
