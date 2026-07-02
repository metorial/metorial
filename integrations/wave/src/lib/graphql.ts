// GraphQL query and mutation definitions for Wave API

// --- Fragments ---

export let BUSINESS_FRAGMENT = `
  id
  name
  isClassicAccounting
  isClassicInvoicing
  isPersonal
  organizationType
  type {
    name
    value
  }
  subtype {
    name
    value
  }
  currency {
    code
    symbol
    name
  }
  address {
    addressLine1
    addressLine2
    city
    province { code name }
    country { code name }
    postalCode
  }
  phone
  fax
  mobile
  tollFree
  website
  createdAt
  modifiedAt
`;

export let CUSTOMER_FRAGMENT = `
  id
  name
  firstName
  lastName
  displayId
  email
  mobile
  phone
  fax
  tollFree
  website
  internalNotes
  currency {
    code
    symbol
    name
  }
  address {
    addressLine1
    addressLine2
    city
    province { code name }
    country { code name }
    postalCode
  }
  shippingDetails {
    name
    phone
    instructions
    address {
      addressLine1
      addressLine2
      city
      province { code name }
      country { code name }
      postalCode
    }
  }
  createdAt
  modifiedAt
`;

export let ACCOUNT_FRAGMENT = `
  id
  name
  description
  displayId
  type {
    name
    normalBalanceType
    value
  }
  subtype {
    name
    value
    type {
      name
      value
    }
  }
  currency {
    code
    symbol
    name
  }
  isArchived
  sequence
  balance
  balanceInBusinessCurrency
  createdAt
  modifiedAt
`;

export let PRODUCT_FRAGMENT = `
  id
  name
  description
  unitPrice
  isSold
  isBought
  isArchived
  incomeAccount {
    id
    name
  }
  expenseAccount {
    id
    name
  }
  defaultSalesTaxes {
    id
    name
  }
  createdAt
  modifiedAt
`;

export let SALES_TAX_FRAGMENT = `
  id
  name
  abbreviation
  description
  taxNumber
  rate
  isCompound
  isRecoverable
  isArchived
  rates {
    effective
    rate
  }
  createdAt
  modifiedAt
`;

export let INVOICE_FRAGMENT = `
  id
  createdAt
  modifiedAt
  pdfUrl
  viewUrl
  status
  title
  subhead
  invoiceNumber
  invoiceDate
  poNumber
  dueDate
  amountDue {
    value
    currency {
      code
      symbol
    }
  }
  amountPaid {
    value
    currency {
      code
      symbol
    }
  }
  taxTotal {
    value
    currency {
      code
      symbol
    }
  }
  total {
    value
    currency {
      code
      symbol
    }
  }
  exchangeRate
  currency {
    code
    symbol
    name
  }
  customer {
    id
    name
    email
  }
  memo
  footer
  disableCreditCardPayments
  disableBankPayments
  itemTitle
  unitTitle
  priceTitle
  amountTitle
  hideName
  hideDescription
  hideUnit
  hidePrice
  hideAmount
  items {
    description
    quantity
    unitPrice
    amount {
      value
      currency {
        code
        symbol
      }
    }
    product {
      id
      name
    }
    taxes {
      amount {
        value
      }
      salesTax {
        id
        name
      }
    }
  }
  lastSentAt
  lastSentVia
  lastViewedAt
`;

export let VENDOR_FRAGMENT = `
  id
  name
  firstName
  lastName
  displayId
  email
  mobile
  phone
  fax
  tollFree
  website
  internalNotes
  currency {
    code
    symbol
    name
  }
  address {
    addressLine1
    addressLine2
    city
    province { code name }
    country { code name }
    postalCode
  }
  shippingDetails {
    name
    phone
    instructions
    address {
      addressLine1
      addressLine2
      city
      province { code name }
      country { code name }
      postalCode
    }
  }
  createdAt
  modifiedAt
`;

export let MUTATION_ERRORS = `
  didSucceed
  inputErrors {
    message
    code
    path
  }
`;

// --- Queries ---

export let LIST_BUSINESSES_QUERY = `
  query($page: Int!, $pageSize: Int!) {
    businesses(page: $page, pageSize: $pageSize) {
      pageInfo {
        currentPage
        totalPages
        totalCount
      }
      edges {
        node {
          ${BUSINESS_FRAGMENT}
        }
      }
    }
  }
`;

export let GET_BUSINESS_QUERY = `
  query($businessId: ID!) {
    business(id: $businessId) {
      ${BUSINESS_FRAGMENT}
    }
  }
`;

export let LIST_CUSTOMERS_QUERY = `
  query($businessId: ID!, $page: Int!, $pageSize: Int!) {
    business(id: $businessId) {
      id
      customers(page: $page, pageSize: $pageSize) {
        pageInfo {
          currentPage
          totalPages
          totalCount
        }
        edges {
          node {
            ${CUSTOMER_FRAGMENT}
          }
        }
      }
    }
  }
`;

export let LIST_ACCOUNTS_QUERY = `
  query($businessId: ID!, $page: Int!, $pageSize: Int!) {
    business(id: $businessId) {
      id
      accounts(page: $page, pageSize: $pageSize) {
        pageInfo {
          currentPage
          totalPages
          totalCount
        }
        edges {
          node {
            ${ACCOUNT_FRAGMENT}
          }
        }
      }
    }
  }
`;

export let LIST_PRODUCTS_QUERY = `
  query($businessId: ID!, $page: Int!, $pageSize: Int!) {
    business(id: $businessId) {
      id
      products(page: $page, pageSize: $pageSize) {
        pageInfo {
          currentPage
          totalPages
          totalCount
        }
        edges {
          node {
            ${PRODUCT_FRAGMENT}
          }
        }
      }
    }
  }
`;

export let LIST_INVOICES_QUERY = `
  query($businessId: ID!, $page: Int!, $pageSize: Int!) {
    business(id: $businessId) {
      id
      invoices(page: $page, pageSize: $pageSize) {
        pageInfo {
          currentPage
          totalPages
          totalCount
        }
        edges {
          node {
            ${INVOICE_FRAGMENT}
          }
        }
      }
    }
  }
`;

export let LIST_INVOICES_BY_CUSTOMER_QUERY = `
  query($businessId: ID!, $page: Int!, $pageSize: Int!, $customerId: ID!) {
    business(id: $businessId) {
      id
      invoices(page: $page, pageSize: $pageSize, customerId: $customerId) {
        pageInfo {
          currentPage
          totalPages
          totalCount
        }
        edges {
          node {
            ${INVOICE_FRAGMENT}
          }
        }
      }
    }
  }
`;

export let LIST_VENDORS_QUERY = `
  query($businessId: ID!, $page: Int!, $pageSize: Int!) {
    business(id: $businessId) {
      id
      vendors(page: $page, pageSize: $pageSize) {
        pageInfo {
          currentPage
          totalPages
          totalCount
        }
        edges {
          node {
            ${VENDOR_FRAGMENT}
          }
        }
      }
    }
  }
`;

export let LIST_SALES_TAXES_QUERY = `
  query($businessId: ID!, $page: Int!, $pageSize: Int!) {
    business(id: $businessId) {
      id
      salesTaxes(page: $page, pageSize: $pageSize) {
        pageInfo {
          currentPage
          totalPages
          totalCount
        }
        edges {
          node {
            ${SALES_TAX_FRAGMENT}
          }
        }
      }
    }
  }
`;

export let GET_USER_QUERY = `
  query {
    user {
      id
      firstName
      lastName
      defaultEmail
      createdAt
      modifiedAt
    }
  }
`;

// --- Mutations ---

export let CREATE_CUSTOMER_MUTATION = `
  mutation($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      ${MUTATION_ERRORS}
      customer {
        ${CUSTOMER_FRAGMENT}
      }
    }
  }
`;

export let PATCH_CUSTOMER_MUTATION = `
  mutation($input: CustomerPatchInput!) {
    customerPatch(input: $input) {
      ${MUTATION_ERRORS}
      customer {
        ${CUSTOMER_FRAGMENT}
      }
    }
  }
`;

export let DELETE_CUSTOMER_MUTATION = `
  mutation($input: CustomerDeleteInput!) {
    customerDelete(input: $input) {
      ${MUTATION_ERRORS}
    }
  }
`;

export let CREATE_ACCOUNT_MUTATION = `
  mutation($input: AccountCreateInput!) {
    accountCreate(input: $input) {
      ${MUTATION_ERRORS}
      account {
        ${ACCOUNT_FRAGMENT}
      }
    }
  }
`;

export let PATCH_ACCOUNT_MUTATION = `
  mutation($input: AccountPatchInput!) {
    accountPatch(input: $input) {
      ${MUTATION_ERRORS}
      account {
        ${ACCOUNT_FRAGMENT}
      }
    }
  }
`;

export let ARCHIVE_ACCOUNT_MUTATION = `
  mutation($input: AccountArchiveInput!) {
    accountArchive(input: $input) {
      ${MUTATION_ERRORS}
    }
  }
`;

export let CREATE_PRODUCT_MUTATION = `
  mutation($input: ProductCreateInput!) {
    productCreate(input: $input) {
      ${MUTATION_ERRORS}
      product {
        ${PRODUCT_FRAGMENT}
      }
    }
  }
`;

export let PATCH_PRODUCT_MUTATION = `
  mutation($input: ProductPatchInput!) {
    productPatch(input: $input) {
      ${MUTATION_ERRORS}
      product {
        ${PRODUCT_FRAGMENT}
      }
    }
  }
`;

export let ARCHIVE_PRODUCT_MUTATION = `
  mutation($input: ProductArchiveInput!) {
    productArchive(input: $input) {
      ${MUTATION_ERRORS}
    }
  }
`;

export let CREATE_SALES_TAX_MUTATION = `
  mutation($input: SalesTaxCreateInput!) {
    salesTaxCreate(input: $input) {
      ${MUTATION_ERRORS}
      salesTax {
        ${SALES_TAX_FRAGMENT}
      }
    }
  }
`;

export let PATCH_SALES_TAX_MUTATION = `
  mutation($input: SalesTaxPatchInput!) {
    salesTaxPatch(input: $input) {
      ${MUTATION_ERRORS}
      salesTax {
        ${SALES_TAX_FRAGMENT}
      }
    }
  }
`;

export let ARCHIVE_SALES_TAX_MUTATION = `
  mutation($input: SalesTaxArchiveInput!) {
    salesTaxArchive(input: $input) {
      ${MUTATION_ERRORS}
    }
  }
`;

export let CREATE_INVOICE_MUTATION = `
  mutation($input: InvoiceCreateInput!) {
    invoiceCreate(input: $input) {
      ${MUTATION_ERRORS}
      invoice {
        ${INVOICE_FRAGMENT}
      }
    }
  }
`;

export let PATCH_INVOICE_MUTATION = `
  mutation($input: InvoicePatchInput!) {
    invoicePatch(input: $input) {
      ${MUTATION_ERRORS}
      invoice {
        ${INVOICE_FRAGMENT}
      }
    }
  }
`;

export let DELETE_INVOICE_MUTATION = `
  mutation($input: InvoiceDeleteInput!) {
    invoiceDelete(input: $input) {
      ${MUTATION_ERRORS}
    }
  }
`;

export let SEND_INVOICE_MUTATION = `
  mutation($input: InvoiceSendInput!) {
    invoiceSend(input: $input) {
      ${MUTATION_ERRORS}
    }
  }
`;

export let APPROVE_INVOICE_MUTATION = `
  mutation($input: InvoiceApproveInput!) {
    invoiceApprove(input: $input) {
      ${MUTATION_ERRORS}
      invoice {
        ${INVOICE_FRAGMENT}
      }
    }
  }
`;

export let MARK_INVOICE_SENT_MUTATION = `
  mutation($input: InvoiceMarkSentInput!) {
    invoiceMarkSent(input: $input) {
      ${MUTATION_ERRORS}
      invoice {
        ${INVOICE_FRAGMENT}
      }
    }
  }
`;

export let CLONE_INVOICE_MUTATION = `
  mutation($input: InvoiceCloneInput!) {
    invoiceClone(input: $input) {
      ${MUTATION_ERRORS}
      invoice {
        ${INVOICE_FRAGMENT}
      }
    }
  }
`;

export let CREATE_MONEY_TRANSACTION_MUTATION = `
  mutation($input: MoneyTransactionCreateInput!) {
    moneyTransactionCreate(input: $input) {
      ${MUTATION_ERRORS}
      transaction {
        id
      }
    }
  }
`;
