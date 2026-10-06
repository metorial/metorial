import { z } from 'zod';

export const legacyInputs = {
  get_company: z.object({
    companyId: z.string().describe('The UUID of the company to retrieve')
  }),
  get_payroll: z.object({
    companyId: z.string().describe('The UUID of the company'),
    payrollId: z.string().describe('The UUID of the payroll')
  }),
  list_contractors: z.object({
    companyId: z.string().describe('The UUID of the company'),
    page: z.number().optional().describe('Page number for pagination'),
    per: z.number().optional().describe('Number of results per page')
  }),
  list_employees: z.object({
    companyId: z.string().describe('The UUID of the company'),
    terminated: z
      .boolean()
      .optional()
      .describe('If true, include terminated employees. If false, only active employees.'),
    page: z.number().optional().describe('Page number for pagination'),
    per: z.number().optional().describe('Number of results per page (max 100)')
  }),
  list_forms: z.object({
    scope: z
      .enum(['company', 'employee', 'single'])
      .describe('Whether to list company forms, employee forms, or get a single form'),
    companyId: z.string().optional().describe('Company UUID (required for scope=company)'),
    employeeId: z.string().optional().describe('Employee UUID (required for scope=employee)'),
    formId: z.string().optional().describe('Form UUID (required for scope=single)')
  }),
  list_pay_schedules: z.object({
    companyId: z.string().describe('The UUID of the company')
  }),
  list_payrolls: z.object({
    companyId: z.string().describe('The UUID of the company'),
    processingStatuses: z
      .array(z.enum(['unprocessed', 'calculated', 'submitted', 'processed', 'paid']))
      .optional()
      .describe('Filter by processing status(es)'),
    startDate: z
      .string()
      .optional()
      .describe('Filter payrolls on or after this date (YYYY-MM-DD)'),
    endDate: z
      .string()
      .optional()
      .describe('Filter payrolls on or before this date (YYYY-MM-DD)'),
    page: z.number().optional().describe('Page number for pagination'),
    per: z.number().optional().describe('Number of results per page')
  }),
  manage_company_benefit: z.object({
    action: z.enum(['list', 'get', 'create', 'update']).describe('The action to perform'),
    companyId: z.string().optional().describe('Company UUID (required for list/create)'),
    companyBenefitId: z
      .string()
      .optional()
      .describe('Company benefit UUID (required for get/update)'),
    version: z
      .string()
      .optional()
      .describe('Resource version for optimistic locking (required for update)'),
    benefitType: z.number().optional().describe('Benefit type ID as defined by Gusto'),
    description: z.string().optional().describe('Description of the benefit'),
    active: z.boolean().optional().describe('Whether the benefit is active'),
    responsibleForEmployerTaxes: z
      .boolean()
      .optional()
      .describe('Whether responsible for employer taxes'),
    responsibleForEmployeeW2: z
      .boolean()
      .optional()
      .describe('Whether responsible for employee W-2')
  }),
  manage_company_location: z.object({
    action: z.enum(['list', 'create', 'update']).describe('The action to perform'),
    companyId: z.string().optional().describe('Company UUID (required for list/create)'),
    locationId: z.string().optional().describe('Location UUID (required for update)'),
    version: z
      .string()
      .optional()
      .describe('Resource version for optimistic locking (required for update)'),
    phoneNumber: z.string().optional().describe('Phone number for the location'),
    street1: z.string().optional().describe('Street address line 1'),
    street2: z.string().optional().describe('Street address line 2'),
    city: z.string().optional().describe('City'),
    state: z.string().optional().describe('State abbreviation (e.g., CA, NY)'),
    zip: z.string().optional().describe('ZIP code'),
    country: z.string().optional().describe('Country (defaults to USA)'),
    mailingAddress: z.boolean().optional().describe('Whether this is a mailing address'),
    filingAddress: z.boolean().optional().describe('Whether this is a filing address')
  }),
  manage_contractor_payment: z.object({
    action: z.enum(['list', 'create', 'cancel']).describe('The action to perform'),
    companyId: z.string().describe('The UUID of the company'),
    contractorPaymentId: z.string().optional().describe('Payment UUID (required for cancel)'),
    contractorId: z.string().optional().describe('Contractor UUID (required for create)'),
    date: z.string().optional().describe('Payment date (YYYY-MM-DD) for creating a payment'),
    wage: z.number().optional().describe('Fixed wage amount'),
    hours: z.number().optional().describe('Number of hours worked (hourly contractors)'),
    bonus: z.number().optional().describe('Bonus amount'),
    reimbursement: z.number().optional().describe('Reimbursement amount'),
    startDate: z.string().optional().describe('Start date for listing payments (YYYY-MM-DD)'),
    endDate: z.string().optional().describe('End date for listing payments (YYYY-MM-DD)')
  }),
  manage_contractor: z.object({
    action: z.enum(['create', 'get', 'update']).describe('The action to perform'),
    companyId: z.string().optional().describe('Company UUID (required for create)'),
    contractorId: z.string().optional().describe('Contractor UUID (required for get/update)'),
    version: z
      .string()
      .optional()
      .describe('Resource version for optimistic locking (required for update)'),
    type: z.enum(['Individual', 'Business']).optional().describe('Contractor type'),
    firstName: z.string().optional().describe('First name (individual contractors)'),
    lastName: z.string().optional().describe('Last name (individual contractors)'),
    businessName: z.string().optional().describe('Business name (business contractors)'),
    email: z.string().optional().describe('Email address'),
    wageType: z.enum(['Fixed', 'Hourly']).optional().describe('Wage type'),
    startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
    ssn: z.string().optional().describe('SSN or EIN for the contractor')
  }),
  manage_department: z.object({
    action: z.enum(['list', 'create', 'update']).describe('The action to perform'),
    companyId: z.string().optional().describe('Company UUID (required for list/create)'),
    departmentId: z.string().optional().describe('Department UUID (required for update)'),
    version: z
      .string()
      .optional()
      .describe('Resource version for optimistic locking (required for update)'),
    title: z.string().optional().describe('Department title/name')
  }),
  manage_earning_type: z.object({
    action: z.enum(['list', 'create', 'update']).describe('The action to perform'),
    companyId: z.string().describe('The UUID of the company'),
    earningTypeId: z.string().optional().describe('Earning type UUID (required for update)'),
    name: z.string().optional().describe('Name of the earning type')
  }),
  manage_employee_benefit: z.object({
    action: z.enum(['list', 'create', 'update']).describe('The action to perform'),
    employeeId: z.string().optional().describe('Employee UUID (required for list/create)'),
    employeeBenefitId: z
      .string()
      .optional()
      .describe('Employee benefit UUID (required for update)'),
    companyBenefitId: z
      .string()
      .optional()
      .describe('Company benefit UUID (required for create)'),
    version: z
      .string()
      .optional()
      .describe('Resource version for optimistic locking (required for update)'),
    active: z.boolean().optional().describe('Whether the enrollment is active'),
    employeeDeduction: z
      .string()
      .optional()
      .describe('Employee deduction amount per pay period'),
    companyContribution: z
      .string()
      .optional()
      .describe('Company contribution amount per pay period'),
    employeeDeductionAnnualMaximum: z
      .string()
      .optional()
      .describe('Annual maximum employee deduction'),
    companyContributionAnnualMaximum: z
      .string()
      .optional()
      .describe('Annual maximum company contribution'),
    deductAsPercentage: z
      .boolean()
      .optional()
      .describe('Whether to deduct as a percentage of pay'),
    contributeAsPercentage: z
      .boolean()
      .optional()
      .describe('Whether company contributes as a percentage'),
    effectiveDate: z
      .string()
      .optional()
      .describe('Effective date for the benefit change (YYYY-MM-DD)')
  }),
  manage_employee: z.object({
    action: z
      .enum(['create', 'get', 'update', 'terminate', 'rehire'])
      .describe('The action to perform'),
    companyId: z.string().optional().describe('Company UUID (required for create)'),
    employeeId: z
      .string()
      .optional()
      .describe('Employee UUID (required for get/update/terminate/rehire)'),
    version: z
      .string()
      .optional()
      .describe('Resource version for optimistic locking (required for update)'),
    firstName: z.string().optional().describe('First name'),
    lastName: z.string().optional().describe('Last name'),
    middleInitial: z.string().optional().describe('Middle initial'),
    email: z.string().optional().describe('Personal email address'),
    dateOfBirth: z.string().optional().describe('Date of birth (YYYY-MM-DD)'),
    ssn: z.string().optional().describe('Social Security Number'),
    effectiveDate: z
      .string()
      .optional()
      .describe('Effective date for termination or rehire (YYYY-MM-DD)'),
    runTerminationPayroll: z
      .boolean()
      .optional()
      .describe('Whether to run a termination payroll')
  }),
  manage_garnishment: z.object({
    action: z.enum(['list', 'create', 'update']).describe('The action to perform'),
    employeeId: z.string().optional().describe('Employee UUID (required for list/create)'),
    garnishmentId: z.string().optional().describe('Garnishment UUID (required for update)'),
    version: z
      .string()
      .optional()
      .describe('Resource version for optimistic locking (required for update)'),
    description: z.string().optional().describe('Description of the garnishment'),
    active: z.boolean().optional().describe('Whether the garnishment is active'),
    amount: z.number().optional().describe('Garnishment amount per pay period'),
    courtOrdered: z.boolean().optional().describe('Whether court-ordered'),
    times: z.number().optional().describe('Number of times to deduct (null for ongoing)'),
    recurringChildSupport: z
      .boolean()
      .optional()
      .describe('Whether this is recurring child support'),
    annualMaximum: z.number().optional().describe('Annual maximum deduction'),
    payPeriodMaximum: z.number().optional().describe('Maximum deduction per pay period'),
    deductAsPercentage: z.boolean().optional().describe('Whether to deduct as a percentage')
  }),
  manage_job_compensation: z.object({
    action: z
      .enum([
        'list_jobs',
        'create_job',
        'update_job',
        'list_compensations',
        'create_compensation',
        'update_compensation'
      ])
      .describe('The action to perform'),
    employeeId: z
      .string()
      .optional()
      .describe('Employee UUID (required for list_jobs/create_job)'),
    jobId: z
      .string()
      .optional()
      .describe('Job UUID (required for update_job/list_compensations/create_compensation)'),
    compensationId: z
      .string()
      .optional()
      .describe('Compensation UUID (required for update_compensation)'),
    version: z.string().optional().describe('Resource version for optimistic locking'),
    title: z.string().optional().describe('Job title'),
    hireDate: z.string().optional().describe('Hire date (YYYY-MM-DD)'),
    rate: z.string().optional().describe('Compensation rate (e.g., "50000.00")'),
    paymentUnit: z
      .string()
      .optional()
      .describe('Payment unit (Hour, Week, Month, Year, Paycheck)'),
    flsaStatus: z
      .string()
      .optional()
      .describe('FLSA status (Exempt, Salaried Nonexempt, Nonexempt, Owner)'),
    effectiveDate: z
      .string()
      .optional()
      .describe('Effective date for the compensation change (YYYY-MM-DD)')
  }),
  manage_time_off: z.object({
    action: z
      .enum(['list_policies', 'get_balances'])
      .describe(
        'list_policies for company policies, get_balances for employee time off activity'
      ),
    companyId: z.string().optional().describe('Company UUID (required for list_policies)'),
    employeeId: z.string().optional().describe('Employee UUID (required for get_balances)')
  }),
  process_payroll: z.object({
    companyId: z.string().describe('The UUID of the company'),
    payrollId: z.string().describe('The UUID of the payroll'),
    action: z
      .enum(['calculate', 'submit'])
      .describe('Whether to calculate or submit the payroll')
  })
} as const;
