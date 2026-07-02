import { Slate } from 'slates';
import { spec } from './spec';
import {
  createEmployment,
  estimateEmploymentCost,
  getCountryFormSchema,
  getEmployment,
  listCompanies,
  listContractAmendments,
  listCountries,
  listEmployments,
  listPayslips,
  manageExpenses,
  manageIncentives,
  manageOffboarding,
  manageTimeOff,
  manageTimesheets,
  updateEmployment
} from './tools';
import {
  companyEvents,
  employmentEvents,
  expenseEvents,
  incentiveEvents,
  offboardingEvents,
  payslipEvents,
  timeoffEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listCompanies,
    listEmployments,
    getEmployment,
    createEmployment,
    updateEmployment,
    manageTimeOff,
    manageExpenses,
    manageIncentives,
    manageOffboarding,
    manageTimesheets,
    listCountries,
    getCountryFormSchema,
    estimateEmploymentCost,
    listPayslips,
    listContractAmendments
  ] as any,
  triggers: [
    employmentEvents,
    timeoffEvents,
    expenseEvents,
    offboardingEvents,
    payslipEvents,
    incentiveEvents,
    companyEvents
  ] as any
});
