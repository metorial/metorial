import { createApiServiceError } from 'slates';
import { validateOracleDate } from './dates';
import type { OracleCollectionPath } from './paths';
import { hasControlCharacters } from './urls';

const FINDERS = {
  invoiceSearch: {
    collection: '/receivablesInvoices',
    variables: {
      TransactionNumber: 'string',
      BillToCustomerNumber: 'string',
      BusinessUnit: 'string',
      InvoiceStatus: ['Complete', 'Incomplete', 'Frozen']
    }
  },
  StandardReceiptsFinder: {
    collection: '/receivablesCustomerAccountActivities/standardReceipts',
    variables: { ReceiptLimitByDays: 'integer', ProcessStatus: ['Open', 'Closed'] }
  },
  findRequesterBySearchTerm: {
    collection: '/procurementPersonsLOV',
    variables: { searchTerm: 'string' }
  },
  findByProcurementBU: {
    collection: '/buyersLOV',
    variables: {
      AgentAccessActionCode: 'string',
      ProcurementBuId: 'integer',
      RequisitioningBuId: 'integer'
    }
  },
  findByRequisitioningBU: {
    collection: '/buyersLOV',
    variables: { ProcurementBuId: 'integer', RequisitioningBuId: 'integer' }
  },
  findByDocumentStyle: {
    collection: '/purchasingLineTypesLOV',
    variables: { DocumentType: 'string', StyleId: 'integer' }
  },
  FindSSPPreferenceByPersonAndBusinessUnit: {
    collection: '/requisitionPreferences',
    variables: {
      PersonId: 'integer',
      RequisitioningBUId: 'integer',
      SysEffectiveDate: 'string'
    }
  },
  findByOrderedDate: {
    collection: '/salesOrdersForOrderHub',
    variables: { FromDate: 'date', ToDate: 'date' }
  },
  findByLotAndSerial: {
    collection: '/receivingTransactionsHistory',
    variables: {
      ItemId: 'integer',
      ItemNumber: 'string',
      LotNumber: 'string',
      OrganizationCode: 'string',
      OrganizationId: 'integer',
      SerialNumber: 'string'
    }
  }
} as const;

export type OracleFinderName = keyof typeof FINDERS;
type FinderValue<T> = T extends 'integer'
  ? string | number
  : T extends readonly string[]
    ? T[number]
    : string;
export type OracleFinderVariables<T extends OracleFinderName> = {
  [K in keyof (typeof FINDERS)[T]['variables']]?: FinderValue<
    (typeof FINDERS)[T]['variables'][K]
  >;
};
declare const finderBrand: unique symbol;
export type OracleFinder = string & { readonly [finderBrand]: true };

type VariableType = 'string' | 'integer' | 'date' | readonly string[];
type FinderDefinition = {
  readonly collection: string;
  readonly variables: Readonly<Record<string, VariableType>>;
};

let invalidFinder = () =>
  createApiServiceError('The Oracle finder or its search values are not supported.', {
    reason: 'oracle_fusion_invalid_finder'
  });

let finderDefinition = (name: string): FinderDefinition => {
  if (!Object.hasOwn(FINDERS, name)) throw invalidFinder();
  return FINDERS[name as OracleFinderName];
};

let finderExpression = (name: string, variables: Record<string, unknown>) => {
  let definition = finderDefinition(name);
  let terms: string[] = [];
  for (let [key, value] of Object.entries(variables)) {
    if (!Object.hasOwn(definition.variables, key)) throw invalidFinder();
    if (value === undefined) continue;
    let type = definition.variables[key];
    if (type === 'integer') {
      if (
        (typeof value !== 'string' && typeof value !== 'number') ||
        (typeof value === 'number' && (!Number.isSafeInteger(value) || value < 0)) ||
        !/^[0-9]+$/.test(String(value))
      ) {
        throw invalidFinder();
      }
    } else if (
      typeof value !== 'string' ||
      !value.trim() ||
      value.length > 2048 ||
      hasControlCharacters(value) ||
      /[,;=]/.test(value) ||
      (Array.isArray(type) && !type.includes(value))
    ) {
      throw invalidFinder();
    }
    if (type === 'date') {
      if (typeof value !== 'string') throw invalidFinder();
      terms.push(`${key}='${validateOracleDate(value, key)}'`);
    } else {
      terms.push(`${key}=${String(value)}`);
    }
  }
  if (!terms.length) throw invalidFinder();
  return `${name};${terms.join(',')}`;
};

export let oracleFinder = <T extends OracleFinderName>(
  name: T,
  variables: OracleFinderVariables<T>
): OracleFinder => finderExpression(name, variables) as OracleFinder;

export let validateOracleFinder = (
  collection: OracleCollectionPath,
  finder: OracleFinder | undefined
) => {
  if (finder === undefined) return;
  if (typeof finder !== 'string') throw invalidFinder();
  let [name, expression, extra] = finder.split(';');
  if (!name || !expression || extra !== undefined) throw invalidFinder();
  let definition = finderDefinition(name);
  let segments = collection.split('/');
  let hierarchy = `/${segments[1]}`;
  for (let index = 4; index < segments.length; index += 3) {
    hierarchy += `/${segments[index]}`;
  }
  if (definition.collection !== hierarchy) throw invalidFinder();
  let variables: Record<string, string> = {};
  for (let term of expression.split(',')) {
    let [key, value, extraValue] = term.split('=');
    if (
      !key ||
      value === undefined ||
      extraValue !== undefined ||
      Object.hasOwn(variables, key)
    ) {
      throw invalidFinder();
    }
    variables[key] =
      definition.variables[key] === 'date' && /^'.*'$/.test(value)
        ? value.slice(1, -1)
        : value;
  }
  if (finderExpression(name, variables) !== finder) throw invalidFinder();
};
