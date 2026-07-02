import { createAuthenticatedAxios, requestAxiosData } from 'slates';
import {
  type BusinessNxtGraphQLError,
  isNonEmptyRecord,
  vismaBusinessNxtApiError,
  vismaBusinessNxtGraphQlError,
  vismaBusinessNxtServiceError
} from './errors';

let BUSINESS_NXT_GRAPHQL_URL = 'https://business.visma.net/api/graphql';

export type SortDirection = 'ASC' | 'DESC';
export type AssociateKind = 'customer' | 'supplier';
export type AssociateLookupType = 'associateNo' | 'customerNo' | 'supplierNo';

type GraphQlResponse<T> = {
  data?: T | null;
  errors?: BusinessNxtGraphQLError[];
  extensions?: Record<string, unknown>;
};

type PageInfo = {
  hasNextPage?: boolean | null;
  hasPreviousPage?: boolean | null;
  startCursor?: string | null;
  endCursor?: string | null;
};

type Connection<T> = {
  totalCount?: number | null;
  pageInfo?: PageInfo | null;
  items?: T[] | null;
};

export type AccessibleCustomer = {
  name?: string | null;
  vismaNetCustomerId?: number | null;
  provider: {
    tableName: string;
    primaryKeys: Record<string, number>;
  };
};

export type AccessibleCompany = {
  name?: string | null;
  vismaNetCompanyId?: number | null;
  vismaNetCustomerId?: number | null;
  provider: {
    tableName: string;
    primaryKeys: Record<string, number>;
  };
};

export type Associate = {
  associateNo?: number | null;
  customerNo?: number | null;
  supplierNo?: number | null;
  name?: string | null;
  provider: {
    tableName: string;
    primaryKeys: Record<string, number>;
  };
};

export type GeneralLedgerAccount = {
  accountNo?: number | null;
  name?: string | null;
  provider: {
    tableName: string;
    primaryKeys: Record<string, number>;
  };
};

export type OrderSummary = {
  orderNo?: number | null;
  customerNo?: number | null;
  employeeNo?: number | null;
  lines: {
    lineNo?: number | null;
    amountDomestic?: number | null;
  }[];
  provider: {
    tableName: string;
    primaryKeys: Record<string, number>;
  };
};

type AccessibleCustomerRow = {
  name?: string | null;
  vismaNetCustomerId?: number | null;
};

type AccessibleCompanyRow = {
  name?: string | null;
  vismaNetCompanyId?: number | null;
  vismaNetCustomerId?: number | null;
};

type AssociateRow = {
  associateNo?: number | null;
  customerNo?: number | null;
  supplierNo?: number | null;
  name?: string | null;
};

type GeneralLedgerAccountRow = {
  accountNo?: number | null;
  name?: string | null;
};

type OrderRow = {
  orderNo?: number | null;
  customerNo?: number | null;
  employeeNo?: number | null;
  joindown_OrderLine_via_Order?: {
    items?:
      | {
          lineNo?: number | null;
          amountDomestic?: number | null;
        }[]
      | null;
  } | null;
};

export type Pagination = {
  totalCount?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  startCursor?: string;
  endCursor?: string;
  nextCursor?: string;
};

export type ListResult<T> = {
  items: T[];
  pagination: Pagination;
};

let pageInfoToPagination = <T>(connection: Connection<T> | undefined | null): Pagination => {
  let pageInfo = connection?.pageInfo;
  let endCursor = pageInfo?.endCursor ?? undefined;
  let hasNextPage = pageInfo?.hasNextPage ?? undefined;

  return {
    totalCount: connection?.totalCount ?? undefined,
    hasNextPage,
    hasPreviousPage: pageInfo?.hasPreviousPage ?? undefined,
    startCursor: pageInfo?.startCursor ?? undefined,
    endCursor,
    nextCursor: hasNextPage ? endCursor : undefined
  };
};

let countOnlyPagination = <T>(
  connection: Pick<Connection<T>, 'totalCount'> | undefined | null
): Pagination => ({
  totalCount: connection?.totalCount ?? undefined
});

let positiveIntClause = (value: number | undefined, field: string) =>
  value !== undefined ? { [field]: { _eq: value } } : undefined;

let compactClauses = (clauses: (Record<string, unknown> | undefined)[]) =>
  clauses.filter((clause): clause is Record<string, unknown> => clause !== undefined);

let andFilter = (clauses: Record<string, unknown>[]) => {
  if (clauses.length === 0) return undefined;
  if (clauses.length === 1) return clauses[0];
  return { _and: clauses };
};

let likeContains = (value: string) => `%${value.trim()}%`;

let primaryKeys = (keys: Record<string, number | null | undefined>) => {
  let output: Record<string, number> = {};

  for (let [key, value] of Object.entries(keys)) {
    if (typeof value === 'number') output[key] = value;
  }

  return output;
};

let provider = (tableName: string, keys: Record<string, number | null | undefined>) => ({
  tableName,
  primaryKeys: primaryKeys(keys)
});

let orderByName = (direction?: SortDirection) =>
  direction ? `, orderBy: [{name: ${direction}}]` : '';

let orderByField = (field: string, direction?: SortDirection) =>
  direction ? `, orderBy: [{${field}: ${direction}}]` : '';

export let buildAssociateFilter = (input: {
  associateNo?: number;
  customerNo?: number;
  supplierNo?: number;
  nameContains?: string;
  kind?: AssociateKind;
}) => {
  let clauses = compactClauses([
    positiveIntClause(input.associateNo, 'associateNo'),
    positiveIntClause(input.customerNo, 'customerNo'),
    positiveIntClause(input.supplierNo, 'supplierNo'),
    input.nameContains?.trim()
      ? { name: { _like: likeContains(input.nameContains) } }
      : undefined,
    input.kind === 'customer' ? { customerNo: { _not_eq: 0 } } : undefined,
    input.kind === 'supplier' ? { supplierNo: { _not_eq: 0 } } : undefined
  ]);

  return andFilter(clauses);
};

export let buildAccountFilter = (input: {
  accountNo?: number;
  accountNoFrom?: number;
  accountNoTo?: number;
  nameContains?: string;
}) => {
  let clauses = compactClauses([
    positiveIntClause(input.accountNo, 'accountNo'),
    input.accountNoFrom !== undefined
      ? { accountNo: { _gte: input.accountNoFrom } }
      : undefined,
    input.accountNoTo !== undefined ? { accountNo: { _lte: input.accountNoTo } } : undefined,
    input.nameContains?.trim()
      ? { name: { _like: likeContains(input.nameContains) } }
      : undefined
  ]);

  return andFilter(clauses);
};

export let buildOrderFilter = (input: { orderNo?: number; customerNo?: number }) => {
  let clauses = compactClauses([
    positiveIntClause(input.orderNo, 'orderNo'),
    positiveIntClause(input.customerNo, 'customerNo')
  ]);

  return andFilter(clauses);
};

export class BusinessNxtClient {
  private http;

  constructor(config: { token: string }) {
    this.http = createAuthenticatedAxios({
      baseURL: BUSINESS_NXT_GRAPHQL_URL,
      authHeader: {
        value: `Bearer ${config.token}`
      },
      contentType: 'application/json',
      headers: {
        Accept: 'application/json'
      }
    });
  }

  private async execute<T>(
    operation: string,
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    let response = await requestAxiosData<GraphQlResponse<T>>(
      operation,
      () =>
        this.http.post('', {
          query,
          variables
        }),
      vismaBusinessNxtApiError
    );

    if (response.errors?.length) {
      throw vismaBusinessNxtGraphQlError(response.errors, operation, response.extensions);
    }

    if (response.data === undefined || response.data === null) {
      throw vismaBusinessNxtServiceError(
        `Visma Business NXT GraphQL ${operation} did not return data.`,
        { reason: 'visma_business_nxt_empty_graphql_response' }
      );
    }

    return response.data;
  }

  async listAccessibleCustomers(options: {
    first?: number;
    last?: number;
    orderDirection?: SortDirection;
  }): Promise<ListResult<AccessibleCustomer>> {
    let data = await this.execute<{
      availableCustomers?: Connection<AccessibleCustomerRow> | null;
    }>(
      'list accessible customers',
      `query VismaBusinessNxtListAccessibleCustomers($first: Int, $last: Int) {
        availableCustomers(first: $first, last: $last${orderByName(options.orderDirection)}) {
          totalCount
          items {
            name
            vismaNetCustomerId
          }
        }
      }`,
      {
        first: options.first,
        last: options.first === undefined ? options.last : undefined
      }
    );

    let connection = data.availableCustomers;
    return {
      items: (connection?.items ?? []).map(item => ({
        ...item,
        provider: provider('availableCustomers', {
          vismaNetCustomerId: item.vismaNetCustomerId
        })
      })),
      pagination: countOnlyPagination(connection)
    };
  }

  async listAccessibleCompanies(options: {
    customerNo?: number;
    first?: number;
    last?: number;
    orderDirection?: SortDirection;
  }): Promise<ListResult<AccessibleCompany>> {
    let data = await this.execute<{
      availableCompanies?: Connection<AccessibleCompanyRow> | null;
    }>(
      'list accessible companies',
      `query VismaBusinessNxtListAccessibleCompanies($customerNo: Int, $first: Int, $last: Int) {
        availableCompanies(customerNo: $customerNo, first: $first, last: $last${orderByName(
          options.orderDirection
        )}) {
          totalCount
          items {
            name
            vismaNetCompanyId
            vismaNetCustomerId
          }
        }
      }`,
      {
        customerNo: options.customerNo,
        first: options.first,
        last: options.first === undefined ? options.last : undefined
      }
    );

    let connection = data.availableCompanies;
    return {
      items: (connection?.items ?? []).map(item => ({
        ...item,
        provider: provider('availableCompanies', {
          vismaNetCompanyId: item.vismaNetCompanyId
        })
      })),
      pagination: countOnlyPagination(connection)
    };
  }

  async searchAssociates(options: {
    companyNo: number;
    first?: number;
    after?: string;
    filter?: Record<string, unknown>;
    orderDirection?: SortDirection;
  }): Promise<ListResult<Associate>> {
    let data = await this.execute<{
      useCompany?: {
        associate?: Connection<AssociateRow> | null;
      } | null;
    }>(
      'search associates',
      `query VismaBusinessNxtSearchAssociates(
        $companyNo: Int!,
        $first: Int,
        $after: String,
        $filter: FilterExpression_Associate
      ) {
        useCompany(no: $companyNo) {
          associate(first: $first, after: $after, filter: $filter${orderByField(
            'name',
            options.orderDirection
          )}) {
            totalCount
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            items {
              associateNo
              customerNo
              supplierNo
              name
            }
          }
        }
      }`,
      {
        companyNo: options.companyNo,
        first: options.first,
        after: options.after,
        filter: isNonEmptyRecord(options.filter) ? options.filter : undefined
      }
    );

    let connection = data.useCompany?.associate;
    return {
      items: (connection?.items ?? []).map(item => ({
        ...item,
        provider: provider('Associate', {
          associateNo: item.associateNo
        })
      })),
      pagination: pageInfoToPagination(connection)
    };
  }

  async getAssociate(options: {
    companyNo: number;
    lookupType: AssociateLookupType;
    lookupNo: number;
  }): Promise<Associate | undefined> {
    let filter = { [options.lookupType]: { _eq: options.lookupNo } };
    let result = await this.searchAssociates({
      companyNo: options.companyNo,
      first: 1,
      filter
    });

    return result.items[0];
  }

  async listChartOfAccounts(options: {
    companyNo: number;
    first?: number;
    after?: string;
    filter?: Record<string, unknown>;
    orderDirection?: SortDirection;
  }): Promise<ListResult<GeneralLedgerAccount>> {
    let data = await this.execute<{
      useCompany?: {
        generalLedgerAccount?: Connection<GeneralLedgerAccountRow> | null;
      } | null;
    }>(
      'list chart of accounts',
      `query VismaBusinessNxtListChartOfAccounts(
        $companyNo: Int!,
        $first: Int,
        $after: String,
        $filter: FilterExpression_GeneralLedgerAccount
      ) {
        useCompany(no: $companyNo) {
          generalLedgerAccount(first: $first, after: $after, filter: $filter${orderByField(
            'accountNo',
            options.orderDirection
          )}) {
            totalCount
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            items {
              accountNo
              name
            }
          }
        }
      }`,
      {
        companyNo: options.companyNo,
        first: options.first,
        after: options.after,
        filter: isNonEmptyRecord(options.filter) ? options.filter : undefined
      }
    );

    let connection = data.useCompany?.generalLedgerAccount;
    return {
      items: (connection?.items ?? []).map(item => ({
        ...item,
        provider: provider('GeneralLedgerAccount', {
          accountNo: item.accountNo
        })
      })),
      pagination: pageInfoToPagination(connection)
    };
  }

  async listOrders(options: {
    companyNo: number;
    first?: number;
    after?: string;
    filter?: Record<string, unknown>;
    orderDirection?: SortDirection;
    lineLimit?: number;
  }): Promise<ListResult<OrderSummary>> {
    let data = await this.execute<{
      useCompany?: {
        order?: Connection<OrderRow> | null;
      } | null;
    }>(
      'list orders',
      `query VismaBusinessNxtListOrders(
        $companyNo: Int!,
        $first: Int,
        $after: String,
        $filter: FilterExpression_Order,
        $lineLimit: Int
      ) {
        useCompany(no: $companyNo) {
          order(first: $first, after: $after, filter: $filter${orderByField(
            'orderNo',
            options.orderDirection
          )}) {
            totalCount
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            items {
              orderNo
              customerNo
              employeeNo
              joindown_OrderLine_via_Order(first: $lineLimit) {
                items {
                  lineNo
                  amountDomestic
                }
              }
            }
          }
        }
      }`,
      {
        companyNo: options.companyNo,
        first: options.first,
        after: options.after,
        filter: isNonEmptyRecord(options.filter) ? options.filter : undefined,
        lineLimit: options.lineLimit
      }
    );

    let connection = data.useCompany?.order;
    return {
      items: (connection?.items ?? []).map(item => ({
        orderNo: item.orderNo,
        customerNo: item.customerNo,
        employeeNo: item.employeeNo,
        lines: item.joindown_OrderLine_via_Order?.items ?? [],
        provider: provider('Order', {
          orderNo: item.orderNo
        })
      })),
      pagination: pageInfoToPagination(connection)
    };
  }
}
