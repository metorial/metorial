import { metorial, z } from '@metorial/mcp-server-sdk';

// @ts-ignore
import OAuthClient from 'npm:intuit-oauth';

metorial.setOauthHandler({
  getAuthForm: () => ({
    fields: [
      {
        type: 'select',
        label: 'Environment',
        key: 'environment',
        isRequired: true,
        options: [
          { value: 'sandbox', label: 'Sandbox' },
          { value: 'production', label: 'Production' }
        ]
      }
    ]
  }),
  getAuthorizationUrl: async input => {
    let oauthClient = new OAuthClient({
      clientId: input.clientId,
      clientSecret: input.clientSecret,
      redirectUri: input.redirectUri,
      environment: input.fields.environment
    });

    let url = await oauthClient.authorizeUri({
      scope: [OAuthClient.scopes.Accounting],
      state: input.state
    });

    return url;
  },
  handleCallback: async input => {
    let oauthClient = new OAuthClient({
      clientId: input.clientId,
      clientSecret: input.clientSecret,
      redirectUri: input.redirectUri,
      environment: input.fields.environment
    });

    let res = await oauthClient.createToken(input.fullUrl);
    return res.token;
  },
  refreshAccessToken: async input => {
    let oauthClient = new OAuthClient({
      clientId: input.clientId,
      clientSecret: input.clientSecret,
      redirectUri: input.redirectUri,
      environment: input.fields.environment
    });

    let res = await oauthClient.refreshUsingToken(input.refreshToken);
    return res.token;
  }
});

metorial.createServer<{
  token: string;
  realmId: string;
  fields: {
    environment: 'sandbox' | 'production';
  };
}>(
  {
    name: 'intuit-mcp-server',
    version: '1.0.0'
  },
  async (server, config) => {
    // Helper function to make QuickBooks API calls
    async function makeQBRequest(endpoint: string, method: string = 'GET', body?: any) {
      const baseUrl =
        config.fields?.environment === 'production'
          ? 'https://quickbooks.api.intuit.com'
          : 'https://sandbox-quickbooks.api.intuit.com';

      const url = `${baseUrl}/v3/company/${config.realmId}${endpoint}`;

      const options: any = {
        method,
        headers: {
          Authorization: `Bearer ${config.token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`QuickBooks API error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    }

    // ==================== CUSTOMER TOOLS ====================

    server.registerTool(
      'list_customers',
      {
        title: 'List Customers',
        description: 'Retrieve a list of customers from QuickBooks',
        inputSchema: {
          maxResults: z
            .number()
            .optional()
            .describe('Maximum number of results to return (default: 100)'),
          startPosition: z
            .number()
            .optional()
            .describe('Starting position for pagination (default: 1)')
        }
      },
      async ({ maxResults = 100, startPosition = 1 }) => {
        const query = `SELECT * FROM Customer MAXRESULTS ${maxResults} STARTPOSITION ${startPosition}`;
        const result = await makeQBRequest(`/query?query=${encodeURIComponent(query)}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_customer',
      {
        title: 'Get Customer',
        description: 'Retrieve a specific customer by ID',
        inputSchema: {
          customerId: z.string().describe('The ID of the customer to retrieve')
        }
      },
      async ({ customerId }) => {
        const result = await makeQBRequest(`/customer/${customerId}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'create_customer',
      {
        title: 'Create Customer',
        description: 'Create a new customer in QuickBooks',
        inputSchema: {
          displayName: z.string().describe('Display name for the customer'),
          givenName: z.string().optional().describe('First name'),
          familyName: z.string().optional().describe('Last name'),
          companyName: z.string().optional().describe('Company name'),
          primaryEmailAddr: z.string().optional().describe('Primary email address'),
          primaryPhone: z.string().optional().describe('Primary phone number'),
          billingAddress: z
            .object({
              line1: z.string().optional(),
              city: z.string().optional(),
              countrySubDivisionCode: z.string().optional(),
              postalCode: z.string().optional()
            })
            .optional()
            .describe('Billing address')
        }
      },
      async input => {
        const customer: any = {
          DisplayName: input.displayName
        };

        if (input.givenName) customer.GivenName = input.givenName;
        if (input.familyName) customer.FamilyName = input.familyName;
        if (input.companyName) customer.CompanyName = input.companyName;
        if (input.primaryEmailAddr)
          customer.PrimaryEmailAddr = { Address: input.primaryEmailAddr };
        if (input.primaryPhone) customer.PrimaryPhone = { FreeFormNumber: input.primaryPhone };
        if (input.billingAddress) customer.BillAddr = input.billingAddress;

        const result = await makeQBRequest('/customer', 'POST', customer);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== INVOICE TOOLS ====================

    server.registerTool(
      'list_invoices',
      {
        title: 'List Invoices',
        description: 'Retrieve a list of invoices from QuickBooks',
        inputSchema: {
          maxResults: z
            .number()
            .optional()
            .describe('Maximum number of results to return (default: 100)'),
          startPosition: z
            .number()
            .optional()
            .describe('Starting position for pagination (default: 1)'),
          customerId: z.string().optional().describe('Filter by customer ID')
        }
      },
      async ({ maxResults = 100, startPosition = 1, customerId }) => {
        let query = `SELECT * FROM Invoice`;
        if (customerId) {
          query += ` WHERE CustomerRef = '${customerId}'`;
        }
        query += ` MAXRESULTS ${maxResults} STARTPOSITION ${startPosition}`;

        const result = await makeQBRequest(`/query?query=${encodeURIComponent(query)}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_invoice',
      {
        title: 'Get Invoice',
        description: 'Retrieve a specific invoice by ID',
        inputSchema: {
          invoiceId: z.string().describe('The ID of the invoice to retrieve')
        }
      },
      async ({ invoiceId }) => {
        const result = await makeQBRequest(`/invoice/${invoiceId}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'create_invoice',
      {
        title: 'Create Invoice',
        description: 'Create a new invoice in QuickBooks',
        inputSchema: {
          customerId: z.string().describe('Customer ID'),
          lineItems: z
            .array(
              z.object({
                description: z.string().describe('Line item description'),
                amount: z.number().describe('Line item amount'),
                quantity: z.number().optional().describe('Quantity (default: 1)'),
                itemId: z.string().optional().describe('Item/Service ID if applicable')
              })
            )
            .describe('Invoice line items'),
          dueDate: z.string().optional().describe('Due date (YYYY-MM-DD format)'),
          txnDate: z.string().optional().describe('Transaction date (YYYY-MM-DD format)')
        }
      },
      async input => {
        const invoice: any = {
          CustomerRef: { value: input.customerId },
          Line: input.lineItems.map((item, index) => {
            const line: any = {
              DetailType: 'SalesItemLineDetail',
              Amount: item.amount,
              Description: item.description,
              SalesItemLineDetail: {
                Qty: item.quantity || 1
              }
            };

            if (item.itemId) {
              line.SalesItemLineDetail.ItemRef = { value: item.itemId };
            }

            return line;
          })
        };

        if (input.dueDate) invoice.DueDate = input.dueDate;
        if (input.txnDate) invoice.TxnDate = input.txnDate;

        const result = await makeQBRequest('/invoice', 'POST', invoice);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'send_invoice',
      {
        title: 'Send Invoice',
        description: 'Send an invoice via email to the customer',
        inputSchema: {
          invoiceId: z.string().describe('The ID of the invoice to send'),
          emailAddress: z
            .string()
            .optional()
            .describe('Override email address (uses customer email by default)')
        }
      },
      async ({ invoiceId, emailAddress }) => {
        let endpoint = `/invoice/${invoiceId}/send`;
        if (emailAddress) {
          endpoint += `?sendTo=${encodeURIComponent(emailAddress)}`;
        }
        const result = await makeQBRequest(endpoint, 'POST');
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== PAYMENT TOOLS ====================

    server.registerTool(
      'list_payments',
      {
        title: 'List Payments',
        description: 'Retrieve a list of payments from QuickBooks',
        inputSchema: {
          maxResults: z
            .number()
            .optional()
            .describe('Maximum number of results to return (default: 100)'),
          startPosition: z
            .number()
            .optional()
            .describe('Starting position for pagination (default: 1)'),
          customerId: z.string().optional().describe('Filter by customer ID')
        }
      },
      async ({ maxResults = 100, startPosition = 1, customerId }) => {
        let query = `SELECT * FROM Payment`;
        if (customerId) {
          query += ` WHERE CustomerRef = '${customerId}'`;
        }
        query += ` MAXRESULTS ${maxResults} STARTPOSITION ${startPosition}`;

        const result = await makeQBRequest(`/query?query=${encodeURIComponent(query)}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'create_payment',
      {
        title: 'Create Payment',
        description: 'Record a payment received from a customer',
        inputSchema: {
          customerId: z.string().describe('Customer ID'),
          totalAmount: z.number().describe('Total payment amount'),
          txnDate: z.string().optional().describe('Transaction date (YYYY-MM-DD format)'),
          paymentMethodId: z.string().optional().describe('Payment method ID'),
          linkedInvoices: z
            .array(
              z.object({
                invoiceId: z.string().describe('Invoice ID'),
                amount: z.number().describe('Amount applied to this invoice')
              })
            )
            .optional()
            .describe('Invoices to apply payment to')
        }
      },
      async input => {
        const payment: any = {
          CustomerRef: { value: input.customerId },
          TotalAmt: input.totalAmount
        };

        if (input.txnDate) payment.TxnDate = input.txnDate;
        if (input.paymentMethodId) payment.PaymentMethodRef = { value: input.paymentMethodId };

        if (input.linkedInvoices && input.linkedInvoices.length > 0) {
          payment.Line = input.linkedInvoices.map(inv => ({
            Amount: inv.amount,
            LinkedTxn: [
              {
                TxnId: inv.invoiceId,
                TxnType: 'Invoice'
              }
            ]
          }));
        }

        const result = await makeQBRequest('/payment', 'POST', payment);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== EXPENSE/BILL TOOLS ====================

    server.registerTool(
      'list_expenses',
      {
        title: 'List Expenses',
        description: 'Retrieve a list of expenses from QuickBooks',
        inputSchema: {
          maxResults: z
            .number()
            .optional()
            .describe('Maximum number of results to return (default: 100)'),
          startPosition: z
            .number()
            .optional()
            .describe('Starting position for pagination (default: 1)')
        }
      },
      async ({ maxResults = 100, startPosition = 1 }) => {
        const query = `SELECT * FROM Purchase WHERE PaymentType = 'Cash' MAXRESULTS ${maxResults} STARTPOSITION ${startPosition}`;
        const result = await makeQBRequest(`/query?query=${encodeURIComponent(query)}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'create_expense',
      {
        title: 'Create Expense',
        description: 'Create a new expense transaction',
        inputSchema: {
          accountId: z.string().describe('Account ID to expense from'),
          amount: z.number().describe('Expense amount'),
          vendorId: z.string().optional().describe('Vendor ID'),
          description: z.string().optional().describe('Expense description'),
          txnDate: z.string().optional().describe('Transaction date (YYYY-MM-DD format)'),
          categoryId: z.string().optional().describe('Expense category/account ID')
        }
      },
      async input => {
        const expense: any = {
          PaymentType: 'Cash',
          AccountRef: { value: input.accountId },
          Line: [
            {
              Amount: input.amount,
              DetailType: 'AccountBasedExpenseLineDetail',
              AccountBasedExpenseLineDetail: {
                AccountRef: { value: input.categoryId || input.accountId }
              }
            }
          ]
        };

        if (input.vendorId) expense.EntityRef = { value: input.vendorId, type: 'Vendor' };
        if (input.description) expense.Line[0].Description = input.description;
        if (input.txnDate) expense.TxnDate = input.txnDate;

        const result = await makeQBRequest('/purchase', 'POST', expense);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== VENDOR TOOLS ====================

    server.registerTool(
      'list_vendors',
      {
        title: 'List Vendors',
        description: 'Retrieve a list of vendors from QuickBooks',
        inputSchema: {
          maxResults: z
            .number()
            .optional()
            .describe('Maximum number of results to return (default: 100)'),
          startPosition: z
            .number()
            .optional()
            .describe('Starting position for pagination (default: 1)')
        }
      },
      async ({ maxResults = 100, startPosition = 1 }) => {
        const query = `SELECT * FROM Vendor MAXRESULTS ${maxResults} STARTPOSITION ${startPosition}`;
        const result = await makeQBRequest(`/query?query=${encodeURIComponent(query)}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== ACCOUNT TOOLS ====================

    server.registerTool(
      'list_accounts',
      {
        title: 'List Accounts',
        description: 'Retrieve a list of accounts from the chart of accounts',
        inputSchema: {
          accountType: z
            .string()
            .optional()
            .describe('Filter by account type (e.g., Bank, Income, Expense)')
        }
      },
      async ({ accountType }) => {
        let query = `SELECT * FROM Account`;
        if (accountType) {
          query += ` WHERE AccountType = '${accountType}'`;
        }
        const result = await makeQBRequest(`/query?query=${encodeURIComponent(query)}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== REPORT TOOLS ====================

    server.registerTool(
      'get_profit_and_loss',
      {
        title: 'Get Profit and Loss Report',
        description: 'Generate a profit and loss (P&L) report',
        inputSchema: {
          startDate: z.string().describe('Start date (YYYY-MM-DD format)'),
          endDate: z.string().describe('End date (YYYY-MM-DD format)'),
          accountingMethod: z
            .enum(['Cash', 'Accrual'])
            .optional()
            .describe('Accounting method (default: Accrual)')
        }
      },
      async ({ startDate, endDate, accountingMethod = 'Accrual' }) => {
        const params = `start_date=${startDate}&end_date=${endDate}&accounting_method=${accountingMethod}`;
        const result = await makeQBRequest(`/reports/ProfitAndLoss?${params}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_balance_sheet',
      {
        title: 'Get Balance Sheet',
        description: 'Generate a balance sheet report',
        inputSchema: {
          date: z.string().describe('Report date (YYYY-MM-DD format)'),
          accountingMethod: z
            .enum(['Cash', 'Accrual'])
            .optional()
            .describe('Accounting method (default: Accrual)')
        }
      },
      async ({ date, accountingMethod = 'Accrual' }) => {
        const params = `date=${date}&accounting_method=${accountingMethod}`;
        const result = await makeQBRequest(`/reports/BalanceSheet?${params}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_cash_flow',
      {
        title: 'Get Cash Flow Report',
        description: 'Generate a cash flow statement',
        inputSchema: {
          startDate: z.string().describe('Start date (YYYY-MM-DD format)'),
          endDate: z.string().describe('End date (YYYY-MM-DD format)')
        }
      },
      async ({ startDate, endDate }) => {
        const params = `start_date=${startDate}&end_date=${endDate}`;
        const result = await makeQBRequest(`/reports/CashFlow?${params}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== ITEM TOOLS ====================

    server.registerTool(
      'list_items',
      {
        title: 'List Items',
        description: 'Retrieve a list of items/products/services',
        inputSchema: {
          maxResults: z
            .number()
            .optional()
            .describe('Maximum number of results to return (default: 100)'),
          type: z
            .string()
            .optional()
            .describe('Filter by item type (e.g., Service, Inventory)')
        }
      },
      async ({ maxResults = 100, type }) => {
        let query = `SELECT * FROM Item`;
        if (type) {
          query += ` WHERE Type = '${type}'`;
        }
        query += ` MAXRESULTS ${maxResults}`;
        const result = await makeQBRequest(`/query?query=${encodeURIComponent(query)}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== COMPANY INFO ====================

    server.registerTool(
      'get_company_info',
      {
        title: 'Get Company Info',
        description: 'Retrieve information about the QuickBooks company',
        inputSchema: {}
      },
      async () => {
        const result = await makeQBRequest(`/companyinfo/${config.realmId}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== RESOURCES ====================

    /*server.registerResource(
  'customer',
  new ResourceTemplate('quickbooks://customer/{customerId}'),
  {
    title: 'Customer Resource',
    description: 'Access individual customer data'
  },
  async (uri, { customerId }) => {
    const result = await makeQBRequest(`/customer/${customerId}`);
    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify(result, null, 2),
        mimeType: 'application/json'
      }]
    };
  }
);

server.registerResource(
  'invoice',
  new ResourceTemplate('quickbooks://invoice/{invoiceId}'),
  {
    title: 'Invoice Resource',
    description: 'Access individual invoice data'
  },
  async (uri, { invoiceId }) => {
    const result = await makeQBRequest(`/invoice/${invoiceId}`);
    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify(result, null, 2),
        mimeType: 'application/json'
      }]
    };
  }
);

server.registerResource(
  'payment',
  new ResourceTemplate('quickbooks://payment/{paymentId}'),
  {
    title: 'Payment Resource',
    description: 'Access individual payment data'
  },
  async (uri, { paymentId }) => {
    const result = await makeQBRequest(`/payment/${paymentId}`);
    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify(result, null, 2),
        mimeType: 'application/json'
      }]
    };
  }
);

server.registerResource(
  'vendor',
  new ResourceTemplate('quickbooks://vendor/{vendorId}'),
  {
    title: 'Vendor Resource',
    description: 'Access individual vendor data'
  },
  async (uri, { vendorId }) => {
    const result = await makeQBRequest(`/vendor/${vendorId}`);
    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify(result, null, 2),
        mimeType: 'application/json'
      }]
    };
  }
);

server.registerResource(
  'account',
  new ResourceTemplate('quickbooks://account/{accountId}'),
  {
    title: 'Account Resource',
    description: 'Access individual account data from chart of accounts'
  },
  async (uri, { accountId }) => {
    const result = await makeQBRequest(`/account/${accountId}`);
    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify(result, null, 2),
        mimeType: 'application/json'
      }]
    };
  }
);*/
  }
);
