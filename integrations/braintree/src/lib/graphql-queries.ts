export let CHARGE_PAYMENT_METHOD = `
  mutation ChargePaymentMethod($input: ChargePaymentMethodInput!) {
    chargePaymentMethod(input: $input) {
      transaction {
        id
        legacyId
        status
        amount {
          value
          currencyCode
        }
        merchantAccountId
        orderId
        customer {
          id
          email
          firstName
          lastName
          company
        }
        paymentMethod {
          details {
            ... on CreditCardDetails {
              brandCode
              last4
              expirationMonth
              expirationYear
              bin
            }
            ... on PayPalTransactionDetails {
              payerEmail
              payerId
            }
            ... on VenmoAccountDetails {
              username
            }
          }
        }
        statusHistory {
          status
          timestamp
          amount {
            value
          }
        }
        createdAt
        updatedAt
      }
    }
  }
`;

export let CREATE_CLIENT_TOKEN = `
  mutation CreateClientToken($input: CreateClientTokenInput!) {
    createClientToken(input: $input) {
      clientToken
    }
  }
`;

export let AUTHORIZE_PAYMENT_METHOD = `
  mutation AuthorizePaymentMethod($input: AuthorizePaymentMethodInput!) {
    authorizePaymentMethod(input: $input) {
      transaction {
        id
        legacyId
        status
        amount {
          value
          currencyCode
        }
        merchantAccountId
        orderId
        customer {
          id
          email
          firstName
          lastName
          company
        }
        paymentMethod {
          details {
            ... on CreditCardDetails {
              brandCode
              last4
              expirationMonth
              expirationYear
              bin
            }
            ... on PayPalTransactionDetails {
              payerEmail
              payerId
            }
            ... on VenmoAccountDetails {
              username
            }
          }
        }
        createdAt
        updatedAt
      }
    }
  }
`;

export let REFUND_TRANSACTION = `
  mutation RefundTransaction($input: RefundTransactionInput!) {
    refundTransaction(input: $input) {
      refund {
        id
        legacyId
        status
        amount {
          value
          currencyCode
        }
        orderId
        refundedTransaction {
          id
          legacyId
        }
        createdAt
      }
    }
  }
`;

export let REVERSE_TRANSACTION = `
  mutation ReverseTransaction($input: ReverseTransactionInput!) {
    reverseTransaction(input: $input) {
      reversal {
        ... on Transaction {
          id
          legacyId
          status
          amount {
            value
            currencyCode
          }
          createdAt
        }
        ... on Refund {
          id
          legacyId
          status
          amount {
            value
            currencyCode
          }
          createdAt
        }
      }
    }
  }
`;

export let VAULT_PAYMENT_METHOD = `
  mutation VaultPaymentMethod($input: VaultPaymentMethodInput!) {
    vaultPaymentMethod(input: $input) {
      paymentMethod {
        id
        legacyId
        usage
        details {
          ... on CreditCardDetails {
            brandCode
            last4
            expirationMonth
            expirationYear
            bin
            cardholderName
          }
          ... on PayPalAccountDetails {
            email
            payerId
          }
          ... on VenmoAccountDetails {
            username
            venmoUserId
          }
          ... on UsBankAccountDetails {
            accountholderName
            bankName
            last4
            routingNumber
            accountType
          }
        }
        customer {
          id
          email
          firstName
          lastName
        }
        createdAt
      }
      verification {
        id
        status
        processorResponse {
          message
          legacyCode
        }
      }
    }
  }
`;

export let DELETE_PAYMENT_METHOD = `
  mutation DeletePaymentMethod($input: DeletePaymentMethodInput!) {
    deletePaymentMethod(input: $input) {
      clientMutationId
    }
  }
`;

export let SEARCH_TRANSACTION = `
  query SearchTransaction($input: TransactionSearchInput!, $first: Int, $after: String) {
    search {
      transactions(input: $input, first: $first, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            id
            legacyId
            status
            amount {
              value
              currencyCode
            }
            merchantAccountId
            orderId
            customer {
              id
              email
              firstName
              lastName
              company
            }
            paymentMethod {
              details {
                ... on CreditCardDetails {
                  brandCode
                  last4
                  expirationMonth
                  expirationYear
                }
                ... on PayPalTransactionDetails {
                  payerEmail
                  payerId
                }
                ... on VenmoAccountDetails {
                  username
                }
              }
            }
            createdAt
            updatedAt
          }
        }
      }
    }
  }
`;

export let SEARCH_CUSTOMERS = `
  query SearchCustomers($input: CustomerSearchInput!, $first: Int, $after: String) {
    search {
      customers(input: $input, first: $first, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            id
            legacyId
            company
            email
            firstName
            lastName
            phoneNumber
            website
            createdAt
          }
        }
      }
    }
  }
`;

export let SEARCH_DISPUTES = `
  query SearchDisputes($input: DisputeSearchInput!, $first: Int, $after: String) {
    search {
      disputes(input: $input, first: $first, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            id
            legacyId
            status
            type
            amountDisputed {
              value
              currencyCode
            }
            receivedDate
            replyByDate
            transaction {
              id
              legacyId
            }
            processorResponse {
              reason
              reasonCode
              reasonDescription
            }
            createdAt
          }
        }
      }
    }
  }
`;

export let SEARCH_SUBSCRIPTIONS = `
  query SearchSubscriptions(
    $input: RecurringBillingSubscriptionSearchInput!
    $first: Int
    $after: String
  ) {
    search {
      recurringBillingSubscriptions(input: $input, first: $first, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            id
            legacyId
            planId
            status
            price
            balance
            paymentMethodId
            merchantAccountId
            billingDayOfMonth
            currentBillingCycle
            numberOfBillingCycles
            failureCount
            daysPastDue
            timeline {
              firstBillingDate
              nextBillingDate
              billingPeriodEndDate
              paidThroughDate
            }
          }
        }
      }
    }
  }
`;

export let CREATE_CUSTOMER = `
  mutation CreateCustomer($input: CreateCustomerInput!) {
    createCustomer(input: $input) {
      customer {
        id
        legacyId
        firstName
        lastName
        company
        email
        phoneNumber
        createdAt
        updatedAt
        paymentMethods {
          edges {
            node {
              id
              legacyId
              usage
              details {
                ... on CreditCardDetails {
                  brandCode
                  last4
                  expirationMonth
                  expirationYear
                }
                ... on PayPalAccountDetails {
                  email
                }
              }
            }
          }
        }
      }
    }
  }
`;

export let UPDATE_CUSTOMER = `
  mutation UpdateCustomer($input: UpdateCustomerInput!) {
    updateCustomer(input: $input) {
      customer {
        id
        legacyId
        firstName
        lastName
        company
        email
        phoneNumber
        createdAt
        updatedAt
      }
    }
  }
`;

export let DELETE_CUSTOMER = `
  mutation DeleteCustomer($input: DeleteCustomerInput!) {
    deleteCustomer(input: $input) {
      clientMutationId
    }
  }
`;
