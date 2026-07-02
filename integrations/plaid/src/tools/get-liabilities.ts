import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaidClient } from '../lib/client';
import { spec } from '../spec';

let creditLiabilitySchema = z.object({
  accountId: z.string().describe('Account ID'),
  isOverdue: z.boolean().nullable().optional().describe('Whether the account is overdue'),
  lastPaymentAmount: z.number().nullable().optional().describe('Last payment amount'),
  lastPaymentDate: z.string().nullable().optional().describe('Last payment date'),
  lastStatementBalance: z.number().nullable().optional().describe('Last statement balance'),
  lastStatementIssueDate: z
    .string()
    .nullable()
    .optional()
    .describe('Last statement issue date'),
  minimumPaymentAmount: z.number().nullable().optional().describe('Minimum payment due'),
  nextPaymentDueDate: z.string().nullable().optional().describe('Next payment due date'),
  aprs: z
    .array(
      z.object({
        aprPercentage: z.number().describe('APR percentage'),
        aprType: z
          .string()
          .describe('APR type: purchase_apr, balance_transfer_apr, cash_apr, etc.'),
        balanceSubjectToApr: z
          .number()
          .nullable()
          .optional()
          .describe('Balance subject to this APR')
      })
    )
    .optional()
    .describe('APR details')
});

let studentLoanSchema = z.object({
  accountId: z.string().describe('Account ID'),
  loanName: z.string().nullable().optional().describe('Name of the loan'),
  interestRatePercentage: z.number().nullable().optional().describe('Interest rate'),
  isOverdue: z.boolean().nullable().optional(),
  lastPaymentAmount: z.number().nullable().optional(),
  lastPaymentDate: z.string().nullable().optional(),
  minimumPaymentAmount: z.number().nullable().optional(),
  nextPaymentDueDate: z.string().nullable().optional(),
  originationDate: z.string().nullable().optional(),
  originationPrincipalAmount: z.number().nullable().optional(),
  outstandingInterestAmount: z.number().nullable().optional(),
  expectedPayoffDate: z.string().nullable().optional(),
  repaymentPlanType: z.string().nullable().optional().describe('Repayment plan type')
});

let mortgageSchema = z.object({
  accountId: z.string().describe('Account ID'),
  loanTerm: z.string().nullable().optional().describe('Loan term, e.g. "30 year"'),
  interestRatePercentage: z.number().nullable().optional(),
  interestRateType: z.string().nullable().optional().describe('fixed or variable'),
  lastPaymentAmount: z.number().nullable().optional(),
  lastPaymentDate: z.string().nullable().optional(),
  nextMonthlyPayment: z.number().nullable().optional(),
  nextPaymentDueDate: z.string().nullable().optional(),
  originationDate: z.string().nullable().optional(),
  originationPrincipalAmount: z.number().nullable().optional(),
  maturityDate: z.string().nullable().optional(),
  hasPmi: z.boolean().nullable().optional().describe('Has private mortgage insurance')
});

export let getLiabilitiesTool = SlateTool.create(spec, {
  name: 'Get Liabilities',
  key: 'get_liabilities',
  description: `Retrieve liability data for credit cards, student loans, and mortgages. Returns payment schedules, interest rates, APRs, outstanding balances, and repayment details for each liability type.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accessToken: z.string().describe('Access token for the Plaid Item'),
      accountIds: z.array(z.string()).optional().describe('Filter to specific account IDs')
    })
  )
  .output(
    z.object({
      credit: z.array(creditLiabilitySchema).describe('Credit card liabilities'),
      student: z.array(studentLoanSchema).describe('Student loan liabilities'),
      mortgage: z.array(mortgageSchema).describe('Mortgage liabilities')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaidClient({
      clientId: ctx.auth.clientId,
      secret: ctx.auth.secret,
      environment: ctx.config.environment
    });

    let result = await client.getLiabilities(ctx.input.accessToken, ctx.input.accountIds);
    let liabilities = result.liabilities || {};

    let credit = (liabilities.credit || []).map((c: any) => ({
      accountId: c.account_id,
      isOverdue: c.is_overdue ?? null,
      lastPaymentAmount: c.last_payment_amount ?? null,
      lastPaymentDate: c.last_payment_date ?? null,
      lastStatementBalance: c.last_statement_balance ?? null,
      lastStatementIssueDate: c.last_statement_issue_date ?? null,
      minimumPaymentAmount: c.minimum_payment_amount ?? null,
      nextPaymentDueDate: c.next_payment_due_date ?? null,
      aprs: (c.aprs || []).map((a: any) => ({
        aprPercentage: a.apr_percentage,
        aprType: a.apr_type,
        balanceSubjectToApr: a.balance_subject_to_apr ?? null
      }))
    }));

    let student = (liabilities.student || []).map((s: any) => ({
      accountId: s.account_id,
      loanName: s.loan_name ?? null,
      interestRatePercentage: s.interest_rate_percentage ?? null,
      isOverdue: s.is_overdue ?? null,
      lastPaymentAmount: s.last_payment_amount ?? null,
      lastPaymentDate: s.last_payment_date ?? null,
      minimumPaymentAmount: s.minimum_payment_amount ?? null,
      nextPaymentDueDate: s.next_payment_due_date ?? null,
      originationDate: s.origination_date ?? null,
      originationPrincipalAmount: s.origination_principal_amount ?? null,
      outstandingInterestAmount: s.outstanding_interest_amount ?? null,
      expectedPayoffDate: s.expected_payoff_date ?? null,
      repaymentPlanType: s.repayment_plan?.type ?? null
    }));

    let mortgage = (liabilities.mortgage || []).map((m: any) => ({
      accountId: m.account_id,
      loanTerm: m.loan_term ?? null,
      interestRatePercentage: m.interest_rate?.percentage ?? null,
      interestRateType: m.interest_rate?.type ?? null,
      lastPaymentAmount: m.last_payment_amount ?? null,
      lastPaymentDate: m.last_payment_date ?? null,
      nextMonthlyPayment: m.next_monthly_payment ?? null,
      nextPaymentDueDate: m.next_payment_due_date ?? null,
      originationDate: m.origination_date ?? null,
      originationPrincipalAmount: m.origination_principal_amount ?? null,
      maturityDate: m.maturity_date ?? null,
      hasPmi: m.has_pmi ?? null
    }));

    return {
      output: { credit, student, mortgage },
      message: `Retrieved **${credit.length}** credit card(s), **${student.length}** student loan(s), **${mortgage.length}** mortgage(s).`
    };
  })
  .build();
