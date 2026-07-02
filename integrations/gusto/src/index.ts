import { Slate } from 'slates';
import { spec } from './spec';
import {
  getCompany,
  getPayroll,
  listContractors,
  listEmployees,
  listForms,
  listPayrolls,
  listPaySchedules,
  manageCompanyBenefit,
  manageCompanyLocation,
  manageContractor,
  manageContractorPayment,
  manageDepartment,
  manageEarningType,
  manageEmployee,
  manageEmployeeBenefit,
  manageGarnishment,
  manageJobCompensation,
  manageTimeOff,
  processPayroll
} from './tools';
import {
  benefitEvents,
  companyEvents,
  contractorEvents,
  employeeEvents,
  formEvents,
  generalEvents,
  payrollEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getCompany,
    listEmployees,
    manageEmployee,
    listContractors,
    manageContractor,
    listPayrolls,
    getPayroll,
    processPayroll,
    manageContractorPayment,
    manageCompanyBenefit,
    manageEmployeeBenefit,
    listPaySchedules,
    manageEarningType,
    manageTimeOff,
    manageGarnishment,
    manageCompanyLocation,
    manageDepartment,
    listForms,
    manageJobCompensation
  ],
  triggers: [
    employeeEvents,
    companyEvents,
    payrollEvents,
    contractorEvents,
    benefitEvents,
    formEvents,
    generalEvents
  ]
});
