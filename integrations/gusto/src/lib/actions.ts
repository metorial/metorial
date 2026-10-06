import { createApiServiceError, isApiErrorRecord } from 'slates';
import type { z } from 'zod';
import { Client, type Resource } from './client';
import {
  decimalAmount,
  exactId,
  getBaseUrl,
  legacyAmount,
  requireFields,
  requirePrivateResponse,
  validateInput
} from './helpers';

const record = (value: unknown): Resource => {
  if (!isApiErrorRecord(value))
    throw createApiServiceError('Gusto returned an invalid resource.', {
      reason: 'invalid_response'
    });
  return value;
};
const list = (value: unknown): Resource[] => {
  if (!Array.isArray(value))
    throw createApiServiceError('Gusto returned an invalid collection.', {
      reason: 'invalid_response'
    });
  return value.map(record);
};
const select = (data: Resource, mapping: Record<string, string>): Resource =>
  Object.fromEntries(
    Object.entries(mapping).map(([publicKey, providerKey]) => {
      const value = data[providerKey];
      if (
        value !== undefined &&
        value !== null &&
        typeof value !== 'string' &&
        typeof value !== 'boolean' &&
        !(typeof value === 'number' && Number.isFinite(value))
      )
        throw createApiServiceError('Gusto returned invalid scalar resource data.', {
          reason: 'invalid_response'
        });
      return [publicKey, value];
    })
  );
const financialValue = (value: unknown) => {
  if (value === undefined || value === null) return value;
  if (typeof value === 'string' && /^-?\d+(?:\.\d+)?$/.test(value)) return value;
  throw createApiServiceError('Gusto did not return an exact decimal amount string.', {
    reason: 'invalid_response'
  });
};
const actionFields: Record<string, Record<string, readonly string[]>> = {
  manage_employee: {
    create: ['firstName', 'lastName', 'middleInitial', 'email', 'dateOfBirth', 'ssn'],
    update: [
      'version',
      'firstName',
      'lastName',
      'middleInitial',
      'email',
      'dateOfBirth',
      'ssn'
    ],
    get: [],
    terminate: ['effectiveDate', 'runTerminationPayroll'],
    rehire: ['effectiveDate', 'fileNewHireReport', 'workLocationId']
  },
  manage_contractor: {
    create: [
      'firstName',
      'lastName',
      'businessName',
      'email',
      'type',
      'wageType',
      'startDate',
      'ssn',
      'hourlyRate'
    ],
    update: [
      'version',
      'firstName',
      'lastName',
      'businessName',
      'email',
      'type',
      'wageType',
      'startDate',
      'ssn',
      'hourlyRate'
    ],
    get: []
  },
  manage_contractor_payment: {
    list: ['startDate', 'endDate'],
    create: ['date', 'wage', 'hours', 'bonus', 'reimbursement'],
    cancel: []
  },
  manage_company_benefit: {
    list: [],
    get: [],
    create: [
      'benefitType',
      'description',
      'active',
      'responsibleForEmployerTaxes',
      'responsibleForEmployeeW2'
    ],
    update: [
      'version',
      'description',
      'active',
      'responsibleForEmployerTaxes',
      'responsibleForEmployeeW2'
    ]
  },
  manage_employee_benefit: {
    list: [],
    create: [
      'active',
      'employeeDeduction',
      'companyContribution',
      'employeeDeductionAnnualMaximum',
      'companyContributionAnnualMaximum',
      'deductAsPercentage',
      'contributeAsPercentage',
      'effectiveDate'
    ],
    update: [
      'version',
      'active',
      'employeeDeduction',
      'companyContribution',
      'employeeDeductionAnnualMaximum',
      'companyContributionAnnualMaximum',
      'deductAsPercentage',
      'contributeAsPercentage',
      'effectiveDate'
    ]
  },
  manage_earning_type: { list: [], create: ['name'], update: ['name'] },
  manage_garnishment: {
    list: [],
    create: [
      'description',
      'active',
      'amount',
      'courtOrdered',
      'times',
      'recurring',
      'recurringChildSupport',
      'annualMaximum',
      'payPeriodMaximum',
      'deductAsPercentage'
    ],
    update: [
      'version',
      'description',
      'active',
      'amount',
      'courtOrdered',
      'times',
      'recurring',
      'recurringChildSupport',
      'annualMaximum',
      'payPeriodMaximum',
      'deductAsPercentage'
    ]
  },
  manage_company_location: {
    list: [],
    create: [
      'phoneNumber',
      'street1',
      'street2',
      'city',
      'state',
      'zip',
      'country',
      'mailingAddress',
      'filingAddress'
    ],
    update: [
      'version',
      'phoneNumber',
      'street1',
      'street2',
      'city',
      'state',
      'zip',
      'country',
      'mailingAddress',
      'filingAddress'
    ]
  },
  manage_department: { list: [], create: ['title'], update: ['version', 'title'] },
  manage_job_compensation: {
    list_jobs: [],
    create_job: ['title', 'hireDate'],
    update_job: ['version', 'title', 'hireDate'],
    list_compensations: [],
    create_compensation: ['rate', 'paymentUnit', 'flsaStatus', 'effectiveDate'],
    update_compensation: ['version', 'rate', 'paymentUnit', 'flsaStatus', 'effectiveDate']
  }
};
const validateActionFields = (key: string, input: Resource) => {
  const actions = actionFields[key];
  const allowed = actions?.[String(input.action)];
  if (!actions || !allowed) return;
  const fields = new Set(Object.values(actions).flat());
  for (const field of fields)
    if (input[field] !== undefined && !allowed.includes(field))
      throw createApiServiceError(
        `${field} is not used by the selected Gusto action. Remove it or select the appropriate action.`,
        {
          reason: 'inapplicable_field'
        }
      );
};
const resourceId = (data: Resource, expected?: string) => {
  const id = exactId(data.uuid ?? data.id);
  if (expected !== undefined && id !== expected)
    throw createApiServiceError(
      'Gusto returned a different resource. Review the target before retrying.',
      { reason: 'resource_mismatch' }
    );
  return id;
};
const inputString = (input: Resource, key: string): string => {
  requireFields(input, [key]);
  if (typeof input[key] !== 'string')
    throw createApiServiceError(`${key} must be a string.`, { reason: 'invalid_input' });
  return input[key];
};
const body = (input: Resource, mapping: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(mapping)
      .filter(([key]) => input[key] !== undefined)
      .map(([key, providerKey]) => [providerKey, input[key]])
  );
const pageParams = (input: Resource) => ({ page: input.page ?? 1, per: input.per ?? 25 });
const employee = (r: Resource, expected?: string) => ({
  employeeId: resourceId(r, expected),
  ...select(r, {
    firstName: 'first_name',
    lastName: 'last_name',
    email: 'email',
    version: 'version',
    onboardingStatus: 'onboarding_status',
    terminated: 'terminated',
    companyId: 'company_uuid',
    middleInitial: 'middle_initial',
    department: 'department',
    twoPercentShareholder: 'two_percent_shareholder'
  })
});
const contractor = (r: Resource, expected?: string) => ({
  contractorId: resourceId(r, expected),
  ...select(r, {
    firstName: 'first_name',
    lastName: 'last_name',
    businessName: 'business_name',
    email: 'email',
    type: 'type',
    wageType: 'wage_type',
    isActive: 'is_active',
    version: 'version',
    companyId: 'company_uuid',
    onboardingStatus: 'onboarding_status'
  })
});
const benefit = (r: Resource, expected?: string) => ({
  companyBenefitId: resourceId(r, expected),
  ...select(r, {
    benefitType: 'benefit_type',
    description: 'description',
    active: 'active',
    name: 'name',
    version: 'version',
    companyId: 'company_uuid'
  })
});
const enrollment = (r: Resource, expected?: string) => ({
  employeeBenefitId: resourceId(r, expected),
  ...select(r, {
    companyBenefitId: 'company_benefit_uuid',
    employeeId: 'employee_uuid',
    active: 'active',
    employeeDeduction: 'employee_deduction',
    companyContribution: 'company_contribution',
    version: 'version',
    effectiveDate: 'effective_date'
  })
});
const garnishment = (r: Resource, expected?: string) => ({
  garnishmentId: resourceId(r, expected),
  ...select(r, {
    description: 'description',
    active: 'active',
    courtOrdered: 'court_ordered',
    version: 'version',
    employeeId: 'employee_uuid',
    recurring: 'recurring',
    times: 'times'
  }),
  amount: legacyAmount(r.amount),
  amountExact: r.amount
});
const location = (r: Resource, expected?: string) => ({
  locationId: resourceId(r, expected),
  ...select(r, {
    street1: 'street_1',
    street2: 'street_2',
    city: 'city',
    state: 'state',
    zip: 'zip',
    phoneNumber: 'phone_number',
    active: 'active',
    version: 'version',
    companyId: 'company_uuid',
    mailingAddress: 'mailing_address',
    filingAddress: 'filing_address'
  })
});
const department = (r: Resource, expected?: string) => ({
  departmentId: resourceId(r, expected),
  ...select(r, { title: 'title', companyId: 'company_uuid', version: 'version' })
});
const job = (r: Resource, expected?: string) => ({
  jobId: resourceId(r, expected),
  ...select(r, {
    title: 'title',
    hireDate: 'hire_date',
    version: 'version',
    employeeId: 'employee_uuid',
    currentCompensationRate: 'rate',
    currentPaymentUnit: 'payment_unit'
  })
});
const compensation = (r: Resource, expected?: string) => ({
  compensationId: resourceId(r, expected),
  ...select(r, {
    rate: 'rate',
    paymentUnit: 'payment_unit',
    flsaStatus: 'flsa_status',
    effectiveDate: 'effective_date',
    version: 'version',
    employeeId: 'employee_uuid',
    jobId: 'job_uuid'
  })
});
const earning = (r: Resource, expected?: string) => ({
  earningTypeId: resourceId(r, expected),
  name: r.name,
  active: r.active
});
const payment = (r: Resource) => ({
  contractorPaymentId: resourceId(r),
  ...select(r, {
    contractorId: 'contractor_uuid',
    wage: 'wage',
    hours: 'hours',
    bonus: 'bonus',
    reimbursement: 'reimbursement',
    paymentDate: 'date',
    status: 'status',
    mayCancel: 'may_cancel'
  })
});
const form = (r: Resource, expected?: string) => ({
  uuid: resourceId(r, expected),
  formId: resourceId(r, expected),
  ...select(r, {
    employee_uuid: 'employee_uuid',
    requires_signing: 'requires_signing',
    document_content_type: 'document_content_type'
  }),
  ...select(r, {
    name: 'name',
    title: 'title',
    description: 'description',
    formType: 'form_type',
    year: 'year',
    signed: 'signed',
    requiresSigning: 'requires_signing',
    draft: 'draft',
    quarter: 'quarter',
    employeeId: 'employee_uuid'
  })
});
const totalKeys = [
  'employee_bonuses',
  'employee_commissions',
  'employee_cash_tips',
  'employee_paycheck_tips',
  'additional_earnings',
  'owners_draw',
  'benefits',
  'check_amount',
  'child_support_debit',
  'company_debit',
  'deferred_payroll_taxes',
  'employee_benefits_deductions',
  'employee_taxes',
  'employer_taxes',
  'gross_pay',
  'imputed_pay',
  'net_pay',
  'net_pay_debit',
  'other_deductions',
  'reimbursement_debit',
  'reimbursements',
  'tax_debit'
];
const totals = (value: unknown) =>
  value === undefined || value === null
    ? value
    : Object.fromEntries(
        totalKeys
          .filter(key => record(value)[key] !== undefined)
          .map(key => [key, financialValue(record(value)[key])])
      );
const payroll = (r: Resource, expected?: string) => {
  const id = exactId(r.payroll_uuid ?? r.uuid);
  if (expected !== undefined && id !== expected)
    throw createApiServiceError('Gusto returned a different payroll.', {
      reason: 'resource_mismatch'
    });
  const period = r.pay_period === undefined ? {} : record(r.pay_period);
  const amount = r.totals === undefined || r.totals === null ? {} : record(r.totals);
  const processing =
    r.processing_request === undefined || r.processing_request === null
      ? {}
      : record(r.processing_request);
  return {
    payrollId: id,
    payPeriodStartDate: period.start_date,
    payPeriodEndDate: period.end_date,
    checkDate: r.check_date,
    processed: r.processed,
    processingStatus: processing.status,
    payrollType:
      r.external === true
        ? 'external'
        : r.off_cycle === true
          ? 'off_cycle'
          : r.off_cycle === false
            ? 'regular'
            : undefined,
    totalGrossPay: amount.gross_pay,
    totalNetPay: amount.net_pay,
    totalEmployerTaxes: amount.employer_taxes,
    totalEmployeeTaxes: amount.employee_taxes,
    totals: totals(r.totals),
    companyId: r.company_uuid,
    version: r.version
  };
};
const employeeCompensation = (r: Resource) => ({
  ...select(r, {
    employee_uuid: 'employee_uuid',
    gross_pay: 'gross_pay',
    net_pay: 'net_pay',
    check_amount: 'check_amount',
    payment_method: 'payment_method',
    excluded: 'excluded',
    version: 'version'
  }),
  gross_pay: financialValue(r.gross_pay),
  net_pay: financialValue(r.net_pay),
  check_amount: financialValue(r.check_amount),
  ...Object.fromEntries(
    [
      'fixed_compensations',
      'hourly_compensations',
      'paid_time_off',
      'taxes',
      'deductions',
      'benefits'
    ]
      .filter(key => r[key] !== undefined)
      .map(key => [
        key,
        list(r[key]).map(value => ({
          ...select(value, {
            uuid: 'uuid',
            name: 'name',
            amount: 'amount',
            hours: 'hours',
            employee_deduction: 'employee_deduction',
            company_contribution: 'company_contribution'
          }),
          amount: financialValue(value.amount),
          employee_deduction: financialValue(value.employee_deduction),
          company_contribution: financialValue(value.company_contribution)
        }))
      ])
  )
});

export async function invokeGusto<T extends z.ZodType>(
  key: string,
  input: Resource,
  auth: { token: string; refreshToken?: string; environment?: string },
  outputSchema: T
) {
  validateInput(input);
  validateActionFields(key, input);
  if (
    input.companyId !== undefined &&
    'companyId' in auth &&
    auth.companyId !== undefined &&
    input.companyId !== auth.companyId
  )
    throw createApiServiceError(
      'Use the companyId from get_current_context for this connection.',
      { reason: 'company_mismatch' }
    );
  const client = new Client({ token: auth.token, baseUrl: getBaseUrl(auth.environment) });
  let output: Resource;
  let message = 'Gusto returned the requested resource.';
  switch (key) {
    case 'get_company': {
      const id = inputString(input, 'companyId');
      const r = await client.getCompany(id);
      output = {
        companyId: resourceId(r, id),
        ...select(r, {
          name: 'name',
          tradeName: 'trade_name',
          ein: 'ein',
          entityType: 'entity_type',
          companyStatus: 'company_status',
          tier: 'tier',
          isSuspended: 'is_suspended',
          isPartnerManaged: 'is_partner_managed'
        }),
        locations:
          r.locations === undefined
            ? undefined
            : list(r.locations).map(value => location(value)),
        primarySignatory:
          r.primary_signatory === null
            ? null
            : r.primary_signatory === undefined
              ? undefined
              : select(record(r.primary_signatory), {
                  uuid: 'uuid',
                  first_name: 'first_name',
                  last_name: 'last_name',
                  email: 'email'
                })
      };
      break;
    }
    case 'list_employees': {
      const r = await client.listEmployees(inputString(input, 'companyId'), {
        ...pageParams(input),
        terminated: input.terminated
      });
      output = {
        employees: r.map(value => employee(value)),
        totalCount: r.pagination.totalCount,
        pagination: r.pagination
      };
      message = `Returned ${r.length} employees in this page.`;
      break;
    }
    case 'list_contractors': {
      const r = await client.listContractors(
        inputString(input, 'companyId'),
        pageParams(input)
      );
      output = { contractors: r.map(value => contractor(value)), pagination: r.pagination };
      break;
    }
    case 'manage_employee': {
      const action = inputString(input, 'action');
      let r: Resource;
      if (action === 'create') {
        requireFields(input, ['firstName', 'lastName']);
        r = await client.createEmployee(
          inputString(input, 'companyId'),
          body(input, {
            firstName: 'first_name',
            lastName: 'last_name',
            middleInitial: 'middle_initial',
            email: 'email',
            dateOfBirth: 'date_of_birth',
            ssn: 'ssn'
          })
        );
        output = employee(r);
      } else if (action === 'get')
        output = employee(
          await client.getEmployee(inputString(input, 'employeeId')),
          inputString(input, 'employeeId')
        );
      else if (action === 'update') {
        const id = inputString(input, 'employeeId');
        requireFields(input, ['version']);
        r = await client.updateEmployee(
          id,
          body(input, {
            version: 'version',
            firstName: 'first_name',
            lastName: 'last_name',
            middleInitial: 'middle_initial',
            email: 'email',
            dateOfBirth: 'date_of_birth',
            ssn: 'ssn'
          })
        );
        output = employee(r, id);
      } else if (action === 'terminate' || action === 'rehire') {
        requireFields(
          input,
          action === 'rehire'
            ? ['effectiveDate', 'fileNewHireReport', 'workLocationId']
            : ['effectiveDate']
        );
        const id = inputString(input, 'employeeId');
        r =
          action === 'terminate'
            ? await client.terminateEmployee(
                id,
                body(input, {
                  effectiveDate: 'effective_date',
                  runTerminationPayroll: 'run_termination_payroll'
                })
              )
            : await client.rehireEmployee(
                id,
                body(input, {
                  effectiveDate: 'effective_date',
                  fileNewHireReport: 'file_new_hire_report',
                  workLocationId: 'work_location_uuid'
                })
              );
        if (exactId(r.employee_uuid) !== id)
          throw createApiServiceError(
            'Gusto returned a different employee employment record.',
            { reason: 'resource_mismatch' }
          );
        const receiptFields =
          action === 'terminate'
            ? {
                effectiveDate: 'effective_date',
                runTerminationPayroll: 'run_termination_payroll'
              }
            : {
                effectiveDate: 'effective_date',
                fileNewHireReport: 'file_new_hire_report',
                workLocationId: 'work_location_uuid'
              };
        if (
          Object.entries(receiptFields).some(
            ([field, providerField]) =>
              input[field] !== undefined && r[providerField] !== input[field]
          )
        )
          throw createApiServiceError(
            'Gusto did not confirm the requested employment date and settings. Review the employee in Gusto before retrying; the change may have completed.',
            { reason: 'employment_receipt_mismatch' }
          );
        output = employee(await client.getEmployee(id), id);
        output.employment = select(r, {
          effectiveDate: 'effective_date',
          active: 'active',
          version: 'version',
          runTerminationPayroll: 'run_termination_payroll',
          fileNewHireReport: 'file_new_hire_report',
          workLocationId: 'work_location_uuid'
        });
        message =
          'Gusto returned the scheduled employment change; check its effective date and active state.';
      } else
        throw createApiServiceError('Unsupported employee action.', {
          reason: 'invalid_action'
        });
      break;
    }
    case 'manage_contractor': {
      const action = inputString(input, 'action');
      const fields = {
        version: 'version',
        firstName: 'first_name',
        lastName: 'last_name',
        businessName: 'business_name',
        email: 'email',
        wageType: 'wage_type',
        startDate: 'start_date',
        hourlyRate: 'hourly_rate'
      };
      if (action === 'get')
        output = contractor(
          await client.getContractor(inputString(input, 'contractorId')),
          inputString(input, 'contractorId')
        );
      else if (action === 'create') {
        requireFields(input, ['type', 'wageType', 'startDate']);
        requireFields(
          input,
          input.type === 'Individual' ? ['firstName', 'lastName'] : ['businessName']
        );
        if (input.wageType === 'Hourly') requireFields(input, ['hourlyRate']);
        const data = body(input, fields);
        data.type = input.type;
        if (
          (input.type === 'Individual' && input.businessName !== undefined) ||
          (input.type === 'Business' &&
            (input.firstName !== undefined || input.lastName !== undefined))
        )
          throw createApiServiceError(
            'Use only the fields for the selected contractor type.',
            { reason: 'invalid_contractor_fields' }
          );
        if (input.ssn !== undefined)
          data[input.type === 'Individual' ? 'ssn' : 'ein'] = input.ssn;
        if (input.hourlyRate !== undefined)
          data.hourly_rate = decimalAmount(input.hourlyRate, 'hourlyRate');
        output = contractor(
          await client.createContractor(inputString(input, 'companyId'), data)
        );
      } else if (action === 'update') {
        requireFields(input, ['version']);
        const id = inputString(input, 'contractorId');
        const before = await client.getContractor(id);
        resourceId(before, id);
        if (input.type !== undefined && input.type !== before.type)
          throw createApiServiceError(
            'Contractor type changes must be reviewed in Gusto because they can affect tax identity.',
            { reason: 'unsupported_type_change' }
          );
        if (
          (before.type === 'Individual' && input.businessName !== undefined) ||
          (before.type === 'Business' &&
            (input.firstName !== undefined || input.lastName !== undefined))
        )
          throw createApiServiceError('Use only fields for the existing contractor type.', {
            reason: 'invalid_contractor_fields'
          });
        const data = body(input, fields);
        if (input.ssn !== undefined)
          data[before.type === 'Individual' ? 'ssn' : 'ein'] = input.ssn;
        if (input.hourlyRate !== undefined)
          data.hourly_rate = decimalAmount(input.hourlyRate, 'hourlyRate');
        if (input.wageType === 'Hourly') requireFields(input, ['hourlyRate']);
        output = contractor(await client.updateContractor(id, data), id);
      } else
        throw createApiServiceError('Unsupported contractor action.', {
          reason: 'invalid_action'
        });
      break;
    }
    case 'list_payrolls': {
      const statuses = input.processingStatuses;
      if (
        statuses !== undefined &&
        (!Array.isArray(statuses) ||
          statuses.some(value => value !== 'processed' && value !== 'unprocessed'))
      )
        throw createApiServiceError(
          'Gusto supports only processed and unprocessed processing-status filters. Use get_payroll to inspect asynchronous processing details.',
          { reason: 'unsupported_status_filter' }
        );
      if (
        input.payrollTypes !== undefined &&
        (typeof input.payrollTypes !== 'string' ||
          input.payrollTypes
            .split(',')
            .some(value => !['regular', 'off_cycle', 'external'].includes(value)))
      )
        throw createApiServiceError(
          'Use comma-separated payroll types regular, off_cycle or external.',
          { reason: 'invalid_payroll_types' }
        );
      const r = await client.listPayrolls(inputString(input, 'companyId'), {
        ...pageParams(input),
        processing_statuses: Array.isArray(statuses) ? statuses.join(',') : undefined,
        start_date: input.startDate,
        end_date: input.endDate,
        include: 'totals,payroll_status_meta',
        payroll_types: input.payrollTypes
      });
      output = { payrolls: r.map(value => payroll(value)), pagination: r.pagination };
      break;
    }
    case 'get_payroll': {
      const id = inputString(input, 'payrollId');
      const r = await client.getPayroll(inputString(input, 'companyId'), id, {
        ...pageParams(input),
        include: 'totals,taxes,deductions,benefits,payroll_status_meta'
      });
      output = {
        ...payroll(r, id),
        employeeCompensations:
          r.employee_compensations === undefined
            ? undefined
            : list(r.employee_compensations).map(employeeCompensation),
        pagination: r.pagination
      };
      break;
    }
    case 'process_payroll': {
      const company = inputString(input, 'companyId');
      const id = inputString(input, 'payrollId');
      const before = await client.getPayroll(company, id);
      if (before.processed !== false)
        throw createApiServiceError(
          'Only an explicitly unprocessed payroll may be calculated or submitted. Review its current state in Gusto.',
          { reason: 'invalid_payroll_state' }
        );
      output =
        input.action === 'calculate'
          ? await client.calculatePayroll(company, id)
          : input.action === 'submit'
            ? await client.submitPayroll(company, id)
            : (() => {
                throw createApiServiceError('Unsupported payroll operation.', {
                  reason: 'invalid_action'
                });
              })();
      message =
        'Gusto accepted the asynchronous payroll request. Use get_payroll to check its eventual outcome before taking another action.';
      break;
    }
    case 'list_pay_schedules': {
      const r = await client.listPaySchedules(
        inputString(input, 'companyId'),
        pageParams(input)
      );
      output = {
        paySchedules: r.map(value => ({
          payScheduleId: resourceId(value),
          ...select(value, {
            frequency: 'frequency',
            anchorPayDate: 'anchor_pay_date',
            anchorEndOfPayPeriod: 'anchor_end_of_pay_period',
            day1: 'day_1',
            day2: 'day_2',
            name: 'name',
            autoPilot: 'auto_payroll',
            version: 'version',
            active: 'active'
          })
        })),
        pagination: r.pagination
      };
      break;
    }
    case 'manage_contractor_payment': {
      const company = inputString(input, 'companyId');
      if (input.action === 'list') {
        requireFields(input, ['startDate', 'endDate']);
        const r = await client.listContractorPayments(company, {
          ...pageParams(input),
          start_date: input.startDate,
          end_date: input.endDate,
          group_by_date: false
        });
        const groups = list(r.contractor_payments);
        output = {
          payments: groups.flatMap(group => list(group.payments).map(payment)),
          totals:
            r.total === undefined
              ? undefined
              : select(record(r.total), { wages: 'wages', reimbursements: 'reimbursements' }),
          pagination: r.pagination
        };
      } else if (input.action === 'create') {
        requireFields(input, ['contractorId', 'date']);
        const id = inputString(input, 'contractorId');
        const data = body(input, { contractorId: 'contractor_uuid', date: 'date' });
        for (const field of ['wage', 'hours', 'bonus', 'reimbursement'])
          if (input[field] !== undefined)
            data[field] = decimalAmount(input[field], field, field === 'hours' ? 3 : 2);
        if (data.wage === undefined && data.hours === undefined)
          throw createApiServiceError(
            'Provide wage for a fixed contractor or hours for an hourly contractor.',
            { reason: 'missing_compensation' }
          );
        const before = await client.getContractor(id);
        resourceId(before, id);
        if (exactId(before.company_uuid) !== company)
          throw createApiServiceError('The contractor belongs to a different company.', {
            reason: 'company_mismatch'
          });
        if (
          (before.wage_type === 'Fixed' && data.hours !== undefined) ||
          (before.wage_type === 'Hourly' && data.wage !== undefined)
        )
          throw createApiServiceError('Payment fields must match the contractor wage type.', {
            reason: 'wage_type_mismatch'
          });
        const r = await client.createContractorPayment(company, data);
        if (exactId(r.contractor_uuid) !== id)
          throw createApiServiceError(
            'Gusto returned a payment for a different contractor. Review it before retrying.',
            { reason: 'resource_mismatch' }
          );
        output = { payment: payment(r) };
      } else if (input.action === 'cancel') {
        const result = await client.cancelContractorPayment(
          company,
          inputString(input, 'contractorPaymentId')
        );
        output = { payment: result };
        message =
          'Gusto acknowledged cancellation and the exact payment is no longer readable.';
      } else
        throw createApiServiceError('Unsupported payment action.', {
          reason: 'invalid_action'
        });
      break;
    }
    case 'manage_company_benefit': {
      const action = inputString(input, 'action');
      if (action === 'list') {
        const r = await client.listCompanyBenefits(inputString(input, 'companyId'));
        output = { benefits: r.map(value => benefit(value)) };
      } else if (action === 'get') {
        const id = inputString(input, 'companyBenefitId');
        output = { benefit: benefit(await client.getCompanyBenefit(id), id) };
      } else if (action === 'create') {
        requireFields(input, ['benefitType', 'description']);
        if (!Number.isSafeInteger(input.benefitType) || Number(input.benefitType) < 1)
          throw createApiServiceError('benefitType must be a positive integer from Gusto.', {
            reason: 'invalid_benefit_type'
          });
        output = {
          benefit: benefit(
            await client.createCompanyBenefit(
              inputString(input, 'companyId'),
              body(input, {
                benefitType: 'benefit_type',
                description: 'description',
                active: 'active',
                responsibleForEmployerTaxes: 'responsible_for_employer_taxes',
                responsibleForEmployeeW2: 'responsible_for_employee_w2'
              })
            )
          )
        };
      } else if (action === 'update') {
        requireFields(input, ['version']);
        if (input.benefitType !== undefined)
          throw createApiServiceError(
            'benefitType is only used when creating a benefit; Gusto does not document changing it.',
            { reason: 'unsupported_field' }
          );
        const id = inputString(input, 'companyBenefitId');
        output = {
          benefit: benefit(
            await client.updateCompanyBenefit(
              id,
              body(input, {
                version: 'version',
                description: 'description',
                active: 'active',
                responsibleForEmployerTaxes: 'responsible_for_employer_taxes',
                responsibleForEmployeeW2: 'responsible_for_employee_w2'
              })
            ),
            id
          )
        };
      } else
        throw createApiServiceError('Unsupported benefit action.', {
          reason: 'invalid_action'
        });
      break;
    }
    case 'manage_employee_benefit': {
      if (input.action === 'list') {
        const r = await client.listEmployeeBenefits(
          inputString(input, 'employeeId'),
          pageParams(input)
        );
        output = { enrollments: r.map(value => enrollment(value)), pagination: r.pagination };
      } else if (input.action === 'create' || input.action === 'update') {
        const data = body(input, {
          version: 'version',
          companyBenefitId: 'company_benefit_uuid',
          active: 'active',
          employeeDeduction: 'employee_deduction',
          companyContribution: 'company_contribution',
          employeeDeductionAnnualMaximum: 'employee_deduction_annual_maximum',
          companyContributionAnnualMaximum: 'company_contribution_annual_maximum',
          deductAsPercentage: 'deduct_as_percentage',
          contributeAsPercentage: 'contribute_as_percentage',
          effectiveDate: 'effective_date'
        });
        for (const field of [
          'employee_deduction',
          'company_contribution',
          'employee_deduction_annual_maximum',
          'company_contribution_annual_maximum'
        ])
          if (data[field] !== undefined) data[field] = decimalAmount(data[field], field);
        if (input.action === 'create') {
          requireFields(input, ['companyBenefitId']);
          output = {
            enrollment: enrollment(
              await client.createEmployeeBenefit(inputString(input, 'employeeId'), data)
            )
          };
        } else {
          requireFields(input, ['version']);
          if (input.companyBenefitId !== undefined)
            throw createApiServiceError(
              'A benefit enrollment cannot be moved to another company benefit. Review a new enrollment in Gusto.',
              { reason: 'unsupported_field' }
            );
          const id = inputString(input, 'employeeBenefitId');
          output = {
            enrollment: enrollment(await client.updateEmployeeBenefit(id, data), id)
          };
        }
      } else
        throw createApiServiceError('Unsupported enrollment action.', {
          reason: 'invalid_action'
        });
      break;
    }
    case 'manage_earning_type': {
      const company = inputString(input, 'companyId');
      if (input.action === 'list') {
        const r = await client.listEarningTypes(company);
        output = {
          defaultEarningTypes: list(r.default).map(value => earning(value)),
          customEarningTypes: list(r.custom).map(value => earning(value))
        };
      } else if (input.action === 'create') {
        requireFields(input, ['name']);
        output = {
          earningType: earning(await client.createEarningType(company, { name: input.name }))
        };
        message =
          'Gusto returned the earning type. Creating an existing inactive name can reactivate it.';
      } else if (input.action === 'update') {
        requireFields(input, ['name']);
        const id = inputString(input, 'earningTypeId');
        output = {
          earningType: earning(
            await client.updateEarningType(company, id, { name: input.name }),
            id
          )
        };
      } else
        throw createApiServiceError('Unsupported earning-type action.', {
          reason: 'invalid_action'
        });
      break;
    }
    case 'manage_time_off': {
      if (input.action === 'list_policies') {
        const r = await client.listTimeOffPolicies(inputString(input, 'companyId'));
        output = {
          policies: r.map(value => ({
            policyId: resourceId(value),
            ...select(value, {
              name: 'name',
              policyType: 'policy_type',
              accrualMethod: 'accrual_method',
              accrualRate: 'accrual_rate',
              accrualPeriod: 'accrual_rate_unit',
              active: 'is_active',
              companyId: 'company_uuid',
              version: 'version'
            })
          }))
        };
      } else if (input.action === 'get_balances') {
        requireFields(input, ['timeOffType']);
        const r = await client.getTimeOffBalances(
          inputString(input, 'employeeId'),
          inputString(input, 'timeOffType')
        );
        output = {
          balances: r.map(value =>
            select(value, {
              policy_uuid: 'policy_uuid',
              time_off_type: 'time_off_type',
              policy_name: 'policy_name',
              event_type: 'event_type',
              event_description: 'event_description',
              effective_time: 'effective_time',
              balance: 'balance',
              balance_change: 'balance_change'
            })
          )
        };
      } else
        throw createApiServiceError('Unsupported time-off action.', {
          reason: 'invalid_action'
        });
      break;
    }
    case 'manage_garnishment': {
      if (input.action === 'list') {
        const r = await client.listGarnishments(
          inputString(input, 'employeeId'),
          pageParams(input)
        );
        output = {
          garnishments: r.map(value => garnishment(value)),
          pagination: r.pagination
        };
      } else if (input.action === 'create' || input.action === 'update') {
        if (input.recurringChildSupport !== undefined)
          throw createApiServiceError(
            'recurringChildSupport is not a documented Gusto field. Complete specialized child-support setup in Gusto; use recurring for ordinary recurring deductions.',
            { reason: 'unsupported_field' }
          );
        const data = body(input, {
          version: 'version',
          description: 'description',
          active: 'active',
          amount: 'amount',
          courtOrdered: 'court_ordered',
          times: 'times',
          recurring: 'recurring',
          annualMaximum: 'annual_maximum',
          payPeriodMaximum: 'pay_period_maximum',
          deductAsPercentage: 'deduct_as_percentage'
        });
        for (const field of ['amount', 'annual_maximum', 'pay_period_maximum'])
          if (data[field] !== undefined) data[field] = decimalAmount(data[field], field);
        if (
          input.times !== undefined &&
          (typeof input.times !== 'number' ||
            !Number.isSafeInteger(input.times) ||
            input.times < 1)
        )
          throw createApiServiceError('times must be a positive integer.', {
            reason: 'invalid_times'
          });
        if (input.action === 'create') {
          requireFields(input, ['amount', 'courtOrdered']);
          output = {
            garnishment: garnishment(
              await client.createGarnishment(inputString(input, 'employeeId'), data)
            )
          };
        } else {
          requireFields(input, ['version']);
          const id = inputString(input, 'garnishmentId');
          output = { garnishment: garnishment(await client.updateGarnishment(id, data), id) };
        }
      } else
        throw createApiServiceError('Unsupported garnishment action.', {
          reason: 'invalid_action'
        });
      break;
    }
    case 'manage_company_location': {
      if (input.action === 'list') {
        const r = await client.listCompanyLocations(
          inputString(input, 'companyId'),
          pageParams(input)
        );
        output = { locations: r.map(value => location(value)), pagination: r.pagination };
      } else if (input.action === 'create' || input.action === 'update') {
        const data = body(input, {
          version: 'version',
          phoneNumber: 'phone_number',
          street1: 'street_1',
          street2: 'street_2',
          city: 'city',
          state: 'state',
          zip: 'zip',
          country: 'country',
          mailingAddress: 'mailing_address',
          filingAddress: 'filing_address'
        });
        if (input.action === 'create') {
          requireFields(input, ['phoneNumber', 'street1', 'city', 'state', 'zip']);
          output = {
            location: location(
              await client.createCompanyLocation(inputString(input, 'companyId'), data)
            )
          };
        } else {
          requireFields(input, ['version']);
          const id = inputString(input, 'locationId');
          output = { location: location(await client.updateCompanyLocation(id, data), id) };
        }
      } else
        throw createApiServiceError('Unsupported location action.', {
          reason: 'invalid_action'
        });
      break;
    }
    case 'manage_department': {
      if (input.action === 'list') {
        const r = await client.listDepartments(inputString(input, 'companyId'));
        output = { departments: r.map(value => department(value)) };
      } else if (input.action === 'create') {
        requireFields(input, ['title']);
        output = {
          department: department(
            await client.createDepartment(inputString(input, 'companyId'), {
              title: input.title
            })
          )
        };
      } else if (input.action === 'update') {
        requireFields(input, ['version', 'title']);
        const id = inputString(input, 'departmentId');
        output = {
          department: department(
            await client.updateDepartment(id, { version: input.version, title: input.title }),
            id
          )
        };
      } else
        throw createApiServiceError('Unsupported department action.', {
          reason: 'invalid_action'
        });
      break;
    }
    case 'list_forms': {
      if (input.scope === 'company') {
        const r = await client.listCompanyForms(inputString(input, 'companyId'));
        output = { forms: r.map(value => form(value)) };
      } else if (input.scope === 'employee') {
        const r = await client.listEmployeeForms(inputString(input, 'employeeId'));
        output = { forms: r.map(value => form(value)) };
      } else if (input.scope === 'single') {
        const id = inputString(input, 'formId');
        output = {
          form: form(
            await client.getForm(id, {
              employeeId: typeof input.employeeId === 'string' ? input.employeeId : undefined
            }),
            id
          )
        };
      } else
        throw createApiServiceError('Unsupported form scope.', { reason: 'invalid_action' });
      break;
    }
    case 'manage_job_compensation': {
      if (input.action === 'list_jobs') {
        const r = await client.listEmployeeJobs(
          inputString(input, 'employeeId'),
          pageParams(input)
        );
        output = { jobs: r.map(value => job(value)), pagination: r.pagination };
      } else if (input.action === 'create_job') {
        requireFields(input, ['title', 'hireDate']);
        output = {
          job: job(
            await client.createEmployeeJob(inputString(input, 'employeeId'), {
              title: input.title,
              hire_date: input.hireDate
            })
          )
        };
      } else if (input.action === 'update_job') {
        requireFields(input, ['version']);
        const id = inputString(input, 'jobId');
        output = {
          job: job(
            await client.updateJob(
              id,
              body(input, { version: 'version', title: 'title', hireDate: 'hire_date' })
            ),
            id
          )
        };
      } else if (input.action === 'list_compensations') {
        const r = await client.listJobCompensations(
          inputString(input, 'jobId'),
          pageParams(input)
        );
        output = {
          compensations: r.map(value => compensation(value)),
          pagination: r.pagination
        };
      } else if (
        input.action === 'create_compensation' ||
        input.action === 'update_compensation'
      ) {
        if (input.action === 'create_compensation')
          requireFields(input, ['rate', 'paymentUnit', 'flsaStatus']);
        else requireFields(input, ['version']);
        const data = body(input, {
          version: 'version',
          rate: 'rate',
          paymentUnit: 'payment_unit',
          flsaStatus: 'flsa_status',
          effectiveDate: 'effective_date'
        });
        if (input.rate !== undefined) data.rate = decimalAmount(input.rate, 'rate');
        if (
          input.paymentUnit !== undefined &&
          !['Hour', 'Week', 'Month', 'Year', 'Paycheck'].includes(String(input.paymentUnit))
        )
          throw createApiServiceError(
            'Use a documented Gusto payment unit: Hour, Week, Month, Year, or Paycheck.',
            { reason: 'invalid_payment_unit' }
          );
        if (
          input.flsaStatus !== undefined &&
          ![
            'Exempt',
            'Salaried Nonexempt',
            'Nonexempt',
            'Owner',
            'Commission Only Exempt',
            'Commission Only Nonexempt'
          ].includes(String(input.flsaStatus))
        )
          throw createApiServiceError('Use a documented Gusto FLSA status.', {
            reason: 'invalid_flsa_status'
          });
        if (input.action === 'create_compensation')
          output = {
            compensation: compensation(
              await client.createJobCompensation(inputString(input, 'jobId'), data)
            )
          };
        else {
          const id = inputString(input, 'compensationId');
          output = {
            compensation: compensation(await client.updateCompensation(id, data), id)
          };
        }
      } else
        throw createApiServiceError('Unsupported job or compensation action.', {
          reason: 'invalid_action'
        });
      break;
    }
    default:
      throw createApiServiceError('Unsupported Gusto tool.', { reason: 'invalid_tool' });
  }
  const parsed = outputSchema.safeParse(output);
  if (!parsed.success)
    throw createApiServiceError(
      'Gusto returned a response that does not match the documented tool output. A requested write may have completed; review it in Gusto before retrying.',
      { reason: 'invalid_response' }
    );
  requirePrivateResponse(parsed.data, auth);
  return { output: parsed.data, message };
}
