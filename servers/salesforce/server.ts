import { metorial, z } from '@metorial/mcp-server-sdk';

function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function generateCodeChallenge(verifier: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

metorial.setOauthHandler({
  getAuthForm: () => ({
    fields: [
      {
        type: 'select',
        label: 'Environment',
        key: 'environment',
        isRequired: true,
        options: [
          { value: 'production', label: 'Production' },
          { value: 'sandbox', label: 'Sandbox' }
        ]
      }
    ]
  }),
  getAuthorizationUrl: async input => {
    const baseUrl =
      input.fields.environment === 'sandbox'
        ? 'https://test.salesforce.com'
        : 'https://login.salesforce.com';

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: input.clientId,
      redirect_uri: input.redirectUri,
      state: input.state,
      scope: 'full refresh_token',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    return {
      authorizationUrl: `${baseUrl}/services/oauth2/authorize?${params.toString()}`,
      codeVerifier: codeVerifier
    };
  },
  handleCallback: async input => {
    try {
      const baseUrl =
        input.fields.environment === 'sandbox'
          ? 'https://test.salesforce.com'
          : 'https://login.salesforce.com';

      const url = new URL(input.fullUrl);
      const code = url.searchParams.get('code');

      if (!code) {
        throw new Error('No authorization code received');
      }

      const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: input.clientId,
        client_secret: input.clientSecret,
        redirect_uri: input.redirectUri,
        code_verifier: input.codeVerifier!
      });

      const tokenResponse = await fetch(`${baseUrl}/services/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: tokenParams.toString()
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${errorText}`);
      }

      const tokenData: any = await tokenResponse.json();

      return {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        instance_url: tokenData.instance_url,
        id: tokenData.id,
        token_type: tokenData.token_type,
        issued_at: tokenData.issued_at,
        signature: tokenData.signature
      };
    } catch (err) {
      console.log(err);
      throw err;
    }
  },
  refreshAccessToken: async input => {
    try {
      const baseUrl =
        input.fields.environment === 'sandbox'
          ? 'https://test.salesforce.com'
          : 'https://login.salesforce.com';

      const tokenParams = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: input.clientId,
        client_secret: input.clientSecret,
        refresh_token: input.refreshToken
      });

      const tokenResponse = await fetch(`${baseUrl}/services/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: tokenParams.toString()
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Token refresh failed: ${errorText}`);
      }

      const tokenData: any = await tokenResponse.json();

      return {
        access_token: tokenData.access_token,
        refresh_token: input.refreshToken, // Salesforce may return a new one, but typically reuses the same
        instance_url: tokenData.instance_url,
        id: tokenData.id,
        token_type: tokenData.token_type,
        issued_at: tokenData.issued_at,
        signature: tokenData.signature
      };
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
});

metorial.createServer<{
  token: string;
  instance_url: string;
  // id: string;
}>(
  {
    name: 'salesforce-mcp-server',
    version: '1.0.0'
  },
  async (server, config) => {
    // Helper function to make Salesforce API calls
    async function makeSFRequest(endpoint: string, method: string = 'GET', body?: any) {
      console.log(config);

      const apiVersion = 'v60.0';
      const url = `${config.instance_url}/services/data/${apiVersion}${endpoint}`;

      const options: any = {
        method,
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Salesforce API error: ${response.status} - ${errorText}`);
      }

      // Handle 204 No Content responses
      if (response.status === 204) {
        return { success: true };
      }

      return await response.json();
    }

    // Helper function to execute SOQL queries
    async function executeQuery(query: string) {
      const encodedQuery = encodeURIComponent(query);
      return await makeSFRequest(`/query?q=${encodedQuery}`);
    }

    // ==================== ACCOUNT TOOLS ====================

    server.registerTool(
      'list_accounts',
      {
        title: 'List Accounts',
        description: 'Retrieve a list of Salesforce accounts',
        inputSchema: {
          limit: z.number().optional().describe('Maximum number of results (default: 100)'),
          offset: z.number().optional().describe('Number of records to skip'),
          orderBy: z
            .string()
            .optional()
            .describe('Field to order by (e.g., "Name", "CreatedDate DESC")')
        }
      },
      async ({ limit = 100, offset = 0, orderBy = 'Name' }) => {
        const query = `SELECT Id, Name, Type, Industry, Phone, Website, BillingCity, BillingState, BillingCountry, Owner.Name, CreatedDate, LastModifiedDate FROM Account ORDER BY ${orderBy} LIMIT ${limit} OFFSET ${offset}`;
        const result = await executeQuery(query);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_account',
      {
        title: 'Get Account',
        description: 'Retrieve a specific account by ID',
        inputSchema: {
          accountId: z.string().describe('The ID of the account to retrieve')
        }
      },
      async ({ accountId }) => {
        const result = await makeSFRequest(`/sobjects/Account/${accountId}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'create_account',
      {
        title: 'Create Account',
        description: 'Create a new account in Salesforce',
        inputSchema: {
          name: z.string().describe('Account name (required)'),
          type: z
            .string()
            .optional()
            .describe('Account type (e.g., Customer, Partner, Prospect)'),
          industry: z.string().optional().describe('Industry'),
          phone: z.string().optional().describe('Phone number'),
          website: z.string().optional().describe('Website URL'),
          billingStreet: z.string().optional().describe('Billing street address'),
          billingCity: z.string().optional().describe('Billing city'),
          billingState: z.string().optional().describe('Billing state/province'),
          billingPostalCode: z.string().optional().describe('Billing postal code'),
          billingCountry: z.string().optional().describe('Billing country'),
          description: z.string().optional().describe('Account description')
        }
      },
      async input => {
        const account: any = {
          Name: input.name
        };

        if (input.type) account.Type = input.type;
        if (input.industry) account.Industry = input.industry;
        if (input.phone) account.Phone = input.phone;
        if (input.website) account.Website = input.website;
        if (input.billingStreet) account.BillingStreet = input.billingStreet;
        if (input.billingCity) account.BillingCity = input.billingCity;
        if (input.billingState) account.BillingState = input.billingState;
        if (input.billingPostalCode) account.BillingPostalCode = input.billingPostalCode;
        if (input.billingCountry) account.BillingCountry = input.billingCountry;
        if (input.description) account.Description = input.description;

        const result = await makeSFRequest('/sobjects/Account', 'POST', account);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'update_account',
      {
        title: 'Update Account',
        description: 'Update an existing account',
        inputSchema: {
          accountId: z.string().describe('Account ID to update'),
          name: z.string().optional().describe('Account name'),
          type: z.string().optional().describe('Account type'),
          industry: z.string().optional().describe('Industry'),
          phone: z.string().optional().describe('Phone number'),
          website: z.string().optional().describe('Website URL'),
          description: z.string().optional().describe('Account description')
        }
      },
      async ({ accountId, ...updates }) => {
        const account: any = {};
        if (updates.name) account.Name = updates.name;
        if (updates.type) account.Type = updates.type;
        if (updates.industry) account.Industry = updates.industry;
        if (updates.phone) account.Phone = updates.phone;
        if (updates.website) account.Website = updates.website;
        if (updates.description) account.Description = updates.description;

        const result: any = await makeSFRequest(
          `/sobjects/Account/${accountId}`,
          'PATCH',
          account
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, id: accountId, ...result }, null, 2)
            }
          ]
        };
      }
    );

    // ==================== CONTACT TOOLS ====================

    server.registerTool(
      'list_contacts',
      {
        title: 'List Contacts',
        description: 'Retrieve a list of contacts',
        inputSchema: {
          accountId: z.string().optional().describe('Filter by account ID'),
          limit: z.number().optional().describe('Maximum number of results (default: 100)'),
          offset: z.number().optional().describe('Number of records to skip')
        }
      },
      async ({ accountId, limit = 100, offset = 0 }) => {
        let query = `SELECT Id, FirstName, LastName, Email, Phone, Title, AccountId, Account.Name, MailingCity, MailingState, MailingCountry, CreatedDate FROM Contact`;
        if (accountId) {
          query += ` WHERE AccountId = '${accountId}'`;
        }
        query += ` ORDER BY LastName LIMIT ${limit} OFFSET ${offset}`;

        const result = await executeQuery(query);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_contact',
      {
        title: 'Get Contact',
        description: 'Retrieve a specific contact by ID',
        inputSchema: {
          contactId: z.string().describe('The ID of the contact to retrieve')
        }
      },
      async ({ contactId }) => {
        const result = await makeSFRequest(`/sobjects/Contact/${contactId}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'create_contact',
      {
        title: 'Create Contact',
        description: 'Create a new contact in Salesforce',
        inputSchema: {
          firstName: z.string().optional().describe('First name'),
          lastName: z.string().describe('Last name (required)'),
          email: z.string().optional().describe('Email address'),
          phone: z.string().optional().describe('Phone number'),
          accountId: z.string().optional().describe('Associated account ID'),
          title: z.string().optional().describe('Job title'),
          mobilePhone: z.string().optional().describe('Mobile phone'),
          mailingStreet: z.string().optional().describe('Mailing street'),
          mailingCity: z.string().optional().describe('Mailing city'),
          mailingState: z.string().optional().describe('Mailing state'),
          mailingPostalCode: z.string().optional().describe('Mailing postal code'),
          mailingCountry: z.string().optional().describe('Mailing country')
        }
      },
      async input => {
        const contact: any = {
          LastName: input.lastName
        };

        if (input.firstName) contact.FirstName = input.firstName;
        if (input.email) contact.Email = input.email;
        if (input.phone) contact.Phone = input.phone;
        if (input.accountId) contact.AccountId = input.accountId;
        if (input.title) contact.Title = input.title;
        if (input.mobilePhone) contact.MobilePhone = input.mobilePhone;
        if (input.mailingStreet) contact.MailingStreet = input.mailingStreet;
        if (input.mailingCity) contact.MailingCity = input.mailingCity;
        if (input.mailingState) contact.MailingState = input.mailingState;
        if (input.mailingPostalCode) contact.MailingPostalCode = input.mailingPostalCode;
        if (input.mailingCountry) contact.MailingCountry = input.mailingCountry;

        const result = await makeSFRequest('/sobjects/Contact', 'POST', contact);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== OPPORTUNITY TOOLS ====================

    server.registerTool(
      'list_opportunities',
      {
        title: 'List Opportunities',
        description: 'Retrieve a list of opportunities',
        inputSchema: {
          accountId: z.string().optional().describe('Filter by account ID'),
          stage: z.string().optional().describe('Filter by stage name'),
          limit: z.number().optional().describe('Maximum number of results (default: 100)'),
          offset: z.number().optional().describe('Number of records to skip')
        }
      },
      async ({ accountId, stage, limit = 100, offset = 0 }) => {
        let query = `SELECT Id, Name, StageName, Amount, CloseDate, Probability, AccountId, Account.Name, Owner.Name, Type, LeadSource, CreatedDate FROM Opportunity`;
        const conditions = [];
        if (accountId) conditions.push(`AccountId = '${accountId}'`);
        if (stage) conditions.push(`StageName = '${stage}'`);
        if (conditions.length > 0) {
          query += ` WHERE ${conditions.join(' AND ')}`;
        }
        query += ` ORDER BY CloseDate DESC LIMIT ${limit} OFFSET ${offset}`;

        const result = await executeQuery(query);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_opportunity',
      {
        title: 'Get Opportunity',
        description: 'Retrieve a specific opportunity by ID',
        inputSchema: {
          opportunityId: z.string().describe('The ID of the opportunity to retrieve')
        }
      },
      async ({ opportunityId }) => {
        const result = await makeSFRequest(`/sobjects/Opportunity/${opportunityId}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'create_opportunity',
      {
        title: 'Create Opportunity',
        description: 'Create a new opportunity',
        inputSchema: {
          name: z.string().describe('Opportunity name (required)'),
          accountId: z.string().describe('Associated account ID (required)'),
          stageName: z
            .string()
            .describe('Sales stage (required, e.g., Prospecting, Qualification, Closed Won)'),
          closeDate: z.string().describe('Expected close date (YYYY-MM-DD format, required)'),
          amount: z.number().optional().describe('Opportunity amount'),
          probability: z.number().optional().describe('Win probability (0-100)'),
          type: z.string().optional().describe('Opportunity type'),
          leadSource: z.string().optional().describe('Lead source'),
          description: z.string().optional().describe('Description')
        }
      },
      async input => {
        const opportunity: any = {
          Name: input.name,
          AccountId: input.accountId,
          StageName: input.stageName,
          CloseDate: input.closeDate
        };

        if (input.amount) opportunity.Amount = input.amount;
        if (input.probability !== undefined) opportunity.Probability = input.probability;
        if (input.type) opportunity.Type = input.type;
        if (input.leadSource) opportunity.LeadSource = input.leadSource;
        if (input.description) opportunity.Description = input.description;

        const result = await makeSFRequest('/sobjects/Opportunity', 'POST', opportunity);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'update_opportunity',
      {
        title: 'Update Opportunity',
        description: 'Update an existing opportunity',
        inputSchema: {
          opportunityId: z.string().describe('Opportunity ID to update'),
          stageName: z.string().optional().describe('Sales stage'),
          amount: z.number().optional().describe('Opportunity amount'),
          closeDate: z.string().optional().describe('Close date (YYYY-MM-DD)'),
          probability: z.number().optional().describe('Win probability (0-100)'),
          description: z.string().optional().describe('Description')
        }
      },
      async ({ opportunityId, ...updates }) => {
        const opportunity: any = {};
        if (updates.stageName) opportunity.StageName = updates.stageName;
        if (updates.amount !== undefined) opportunity.Amount = updates.amount;
        if (updates.closeDate) opportunity.CloseDate = updates.closeDate;
        if (updates.probability !== undefined) opportunity.Probability = updates.probability;
        if (updates.description) opportunity.Description = updates.description;

        const result: any = await makeSFRequest(
          `/sobjects/Opportunity/${opportunityId}`,
          'PATCH',
          opportunity
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, id: opportunityId, ...result }, null, 2)
            }
          ]
        };
      }
    );

    // ==================== LEAD TOOLS ====================

    server.registerTool(
      'list_leads',
      {
        title: 'List Leads',
        description: 'Retrieve a list of leads',
        inputSchema: {
          status: z.string().optional().describe('Filter by lead status'),
          limit: z.number().optional().describe('Maximum number of results (default: 100)'),
          offset: z.number().optional().describe('Number of records to skip')
        }
      },
      async ({ status, limit = 100, offset = 0 }) => {
        let query = `SELECT Id, FirstName, LastName, Company, Email, Phone, Status, LeadSource, Title, Industry, City, State, Country, Rating, CreatedDate FROM Lead`;
        if (status) {
          query += ` WHERE Status = '${status}'`;
        }
        query += ` ORDER BY CreatedDate DESC LIMIT ${limit} OFFSET ${offset}`;

        const result = await executeQuery(query);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'create_lead',
      {
        title: 'Create Lead',
        description: 'Create a new lead',
        inputSchema: {
          firstName: z.string().optional().describe('First name'),
          lastName: z.string().describe('Last name (required)'),
          company: z.string().describe('Company name (required)'),
          email: z.string().optional().describe('Email address'),
          phone: z.string().optional().describe('Phone number'),
          title: z.string().optional().describe('Job title'),
          status: z.string().optional().describe('Lead status (default: Open)'),
          leadSource: z.string().optional().describe('Lead source'),
          industry: z.string().optional().describe('Industry'),
          rating: z.string().optional().describe('Lead rating (Hot, Warm, Cold)')
        }
      },
      async input => {
        const lead: any = {
          LastName: input.lastName,
          Company: input.company,
          Status: input.status || 'Open'
        };

        if (input.firstName) lead.FirstName = input.firstName;
        if (input.email) lead.Email = input.email;
        if (input.phone) lead.Phone = input.phone;
        if (input.title) lead.Title = input.title;
        if (input.leadSource) lead.LeadSource = input.leadSource;
        if (input.industry) lead.Industry = input.industry;
        if (input.rating) lead.Rating = input.rating;

        const result = await makeSFRequest('/sobjects/Lead', 'POST', lead);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'convert_lead',
      {
        title: 'Convert Lead',
        description: 'Convert a lead to account, contact, and optionally opportunity',
        inputSchema: {
          leadId: z.string().describe('Lead ID to convert'),
          createOpportunity: z
            .boolean()
            .optional()
            .describe('Create opportunity (default: true)'),
          opportunityName: z.string().optional().describe('Opportunity name if creating'),
          convertedStatus: z
            .string()
            .optional()
            .describe('Converted status (default: Qualified)')
        }
      },
      async ({
        leadId,
        createOpportunity = true,
        opportunityName,
        convertedStatus = 'Qualified'
      }) => {
        const convertRequest: any = {
          leadId: leadId,
          convertedStatus: convertedStatus,
          doNotCreateOpportunity: !createOpportunity
        };

        if (createOpportunity && opportunityName) {
          convertRequest.opportunityName = opportunityName;
        }

        const result = await makeSFRequest(
          '/actions/standard/convertLead',
          'POST',
          convertRequest
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== CASE TOOLS ====================

    server.registerTool(
      'list_cases',
      {
        title: 'List Cases',
        description: 'Retrieve a list of support cases',
        inputSchema: {
          accountId: z.string().optional().describe('Filter by account ID'),
          status: z.string().optional().describe('Filter by case status'),
          limit: z.number().optional().describe('Maximum number of results (default: 100)'),
          offset: z.number().optional().describe('Number of records to skip')
        }
      },
      async ({ accountId, status, limit = 100, offset = 0 }) => {
        let query = `SELECT Id, CaseNumber, Subject, Status, Priority, Origin, AccountId, Account.Name, ContactId, Contact.Name, CreatedDate, ClosedDate FROM Case`;
        const conditions = [];
        if (accountId) conditions.push(`AccountId = '${accountId}'`);
        if (status) conditions.push(`Status = '${status}'`);
        if (conditions.length > 0) {
          query += ` WHERE ${conditions.join(' AND ')}`;
        }
        query += ` ORDER BY CreatedDate DESC LIMIT ${limit} OFFSET ${offset}`;

        const result = await executeQuery(query);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'create_case',
      {
        title: 'Create Case',
        description: 'Create a new support case',
        inputSchema: {
          subject: z.string().describe('Case subject (required)'),
          description: z.string().optional().describe('Case description'),
          accountId: z.string().optional().describe('Associated account ID'),
          contactId: z.string().optional().describe('Associated contact ID'),
          status: z.string().optional().describe('Case status (default: New)'),
          priority: z.string().optional().describe('Priority (High, Medium, Low)'),
          origin: z.string().optional().describe('Case origin (Phone, Email, Web)')
        }
      },
      async input => {
        const caseObj: any = {
          Subject: input.subject,
          Status: input.status || 'New'
        };

        if (input.description) caseObj.Description = input.description;
        if (input.accountId) caseObj.AccountId = input.accountId;
        if (input.contactId) caseObj.ContactId = input.contactId;
        if (input.priority) caseObj.Priority = input.priority;
        if (input.origin) caseObj.Origin = input.origin;

        const result = await makeSFRequest('/sobjects/Case', 'POST', caseObj);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== TASK TOOLS ====================

    server.registerTool(
      'list_tasks',
      {
        title: 'List Tasks',
        description: 'Retrieve a list of tasks',
        inputSchema: {
          relatedToId: z
            .string()
            .optional()
            .describe('Filter by related record ID (Account, Contact, etc.)'),
          status: z.string().optional().describe('Filter by task status'),
          limit: z.number().optional().describe('Maximum number of results (default: 100)')
        }
      },
      async ({ relatedToId, status, limit = 100 }) => {
        let query = `SELECT Id, Subject, Status, Priority, ActivityDate, Description, WhoId, WhatId, Owner.Name FROM Task`;
        const conditions = [];
        if (relatedToId) conditions.push(`WhatId = '${relatedToId}'`);
        if (status) conditions.push(`Status = '${status}'`);
        if (conditions.length > 0) {
          query += ` WHERE ${conditions.join(' AND ')}`;
        }
        query += ` ORDER BY ActivityDate DESC LIMIT ${limit}`;

        const result = await executeQuery(query);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'create_task',
      {
        title: 'Create Task',
        description: 'Create a new task',
        inputSchema: {
          subject: z.string().describe('Task subject (required)'),
          status: z.string().optional().describe('Task status (default: Not Started)'),
          priority: z.string().optional().describe('Priority (High, Normal, Low)'),
          activityDate: z.string().optional().describe('Due date (YYYY-MM-DD)'),
          description: z.string().optional().describe('Task description'),
          relatedToId: z
            .string()
            .optional()
            .describe('Related record ID (Account, Opportunity, etc.)'),
          assignedToId: z.string().optional().describe('User ID to assign task to')
        }
      },
      async input => {
        const task: any = {
          Subject: input.subject,
          Status: input.status || 'Not Started'
        };

        if (input.priority) task.Priority = input.priority;
        if (input.activityDate) task.ActivityDate = input.activityDate;
        if (input.description) task.Description = input.description;
        if (input.relatedToId) task.WhatId = input.relatedToId;
        if (input.assignedToId) task.OwnerId = input.assignedToId;

        const result = await makeSFRequest('/sobjects/Task', 'POST', task);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== CUSTOM QUERY TOOL ====================

    server.registerTool(
      'execute_soql',
      {
        title: 'Execute SOQL Query',
        description: 'Execute a custom SOQL query against Salesforce',
        inputSchema: {
          query: z.string().describe('SOQL query to execute')
        }
      },
      async ({ query }) => {
        const result = await executeQuery(query);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== SEARCH TOOL ====================

    server.registerTool(
      'search_records',
      {
        title: 'Search Records',
        description: 'Search across multiple Salesforce objects using SOSL',
        inputSchema: {
          searchTerm: z.string().describe('Search term'),
          objects: z
            .array(z.string())
            .optional()
            .describe('Object types to search (e.g., Account, Contact, Lead)'),
          limit: z.number().optional().describe('Maximum results per object (default: 25)')
        }
      },
      async ({ searchTerm, objects, limit = 25 }) => {
        let soslQuery = `FIND {${searchTerm}} IN ALL FIELDS RETURNING`;

        if (objects && objects.length > 0) {
          const returning = objects.map(obj => `${obj}(Id, Name LIMIT ${limit})`).join(', ');
          soslQuery += ` ${returning}`;
        } else {
          soslQuery += ` Account(Id, Name LIMIT ${limit}), Contact(Id, Name, Email LIMIT ${limit}), Lead(Id, Name, Company LIMIT ${limit})`;
        }

        const encodedQuery = encodeURIComponent(soslQuery);
        const result = await makeSFRequest(`/search?q=${encodedQuery}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== DESCRIBE TOOLS ====================

    server.registerTool(
      'describe_object',
      {
        title: 'Describe Object',
        description:
          'Get metadata about a Salesforce object including fields and relationships',
        inputSchema: {
          objectName: z
            .string()
            .describe('Object API name (e.g., Account, Contact, CustomObject__c)')
        }
      },
      async ({ objectName }) => {
        const result = await makeSFRequest(`/sobjects/${objectName}/describe`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'list_objects',
      {
        title: 'List Objects',
        description: 'List all available Salesforce objects in the org',
        inputSchema: {}
      },
      async () => {
        const result = await makeSFRequest('/sobjects');
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );
  }
);
