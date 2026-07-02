import { createAxios } from 'slates';
import { signRequest } from './signing';

export interface SesClientConfig {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region: string;
}

export class SesClient {
  private baseUrl: string;
  private config: SesClientConfig;

  constructor(config: SesClientConfig) {
    this.config = config;
    this.baseUrl = `https://email.${config.region}.amazonaws.com`;
  }

  private async request<T = any>(
    method: string,
    path: string,
    body?: any,
    queryParams?: Record<string, string>
  ): Promise<T> {
    let url = `${this.baseUrl}${path}`;
    if (queryParams) {
      let params = new URLSearchParams();
      for (let [k, v] of Object.entries(queryParams)) {
        if (v !== undefined && v !== null && v !== '') {
          params.set(k, v);
        }
      }
      let qs = params.toString();
      if (qs) url += `?${qs}`;
    }

    let bodyStr = body ? JSON.stringify(body) : undefined;
    let headers: Record<string, string> = {
      'content-type': 'application/json'
    };

    let signedHeaders = await signRequest({
      method,
      url,
      headers,
      body: bodyStr,
      accessKeyId: this.config.accessKeyId,
      secretAccessKey: this.config.secretAccessKey,
      sessionToken: this.config.sessionToken,
      region: this.config.region,
      service: 'ses'
    });

    let ax = createAxios({ baseURL: this.baseUrl });
    let response = await ax.request({
      method,
      url,
      data: bodyStr,
      headers: signedHeaders
    });

    return response.data;
  }

  // ==================== Email Sending ====================

  async sendEmail(params: {
    fromEmailAddress?: string;
    destination?: {
      toAddresses?: string[];
      ccAddresses?: string[];
      bccAddresses?: string[];
    };
    content: {
      simple?: {
        subject: { data: string; charset?: string };
        body: {
          text?: { data: string; charset?: string };
          html?: { data: string; charset?: string };
        };
        headers?: { name: string; value: string }[];
      };
      raw?: { data: string };
      template?: {
        templateName?: string;
        templateArn?: string;
        templateData?: string;
        headers?: { name: string; value: string }[];
      };
    };
    replyToAddresses?: string[];
    feedbackForwardingEmailAddress?: string;
    emailTags?: { name: string; value: string }[];
    configurationSetName?: string;
    listManagementOptions?: {
      contactListName: string;
      topicName?: string;
    };
  }): Promise<{ messageId: string }> {
    let body: any = {};

    if (params.fromEmailAddress) body.FromEmailAddress = params.fromEmailAddress;
    if (params.destination) {
      body.Destination = {};
      if (params.destination.toAddresses)
        body.Destination.ToAddresses = params.destination.toAddresses;
      if (params.destination.ccAddresses)
        body.Destination.CcAddresses = params.destination.ccAddresses;
      if (params.destination.bccAddresses)
        body.Destination.BccAddresses = params.destination.bccAddresses;
    }

    if (params.content.simple) {
      let s = params.content.simple;
      body.Content = {
        Simple: {
          Subject: {
            Data: s.subject.data,
            ...(s.subject.charset ? { Charset: s.subject.charset } : {})
          },
          Body: {}
        }
      };
      if (s.body.text) {
        body.Content.Simple.Body.Text = {
          Data: s.body.text.data,
          ...(s.body.text.charset ? { Charset: s.body.text.charset } : {})
        };
      }
      if (s.body.html) {
        body.Content.Simple.Body.Html = {
          Data: s.body.html.data,
          ...(s.body.html.charset ? { Charset: s.body.html.charset } : {})
        };
      }
      if (s.headers && s.headers.length > 0) {
        body.Content.Simple.Headers = s.headers.map(h => ({ Name: h.name, Value: h.value }));
      }
    } else if (params.content.raw) {
      body.Content = { Raw: { Data: params.content.raw.data } };
    } else if (params.content.template) {
      let t = params.content.template;
      body.Content = { Template: {} };
      if (t.templateName) body.Content.Template.TemplateName = t.templateName;
      if (t.templateArn) body.Content.Template.TemplateArn = t.templateArn;
      if (t.templateData) body.Content.Template.TemplateData = t.templateData;
      if (t.headers && t.headers.length > 0) {
        body.Content.Template.Headers = t.headers.map(h => ({ Name: h.name, Value: h.value }));
      }
    }

    if (params.replyToAddresses) body.ReplyToAddresses = params.replyToAddresses;
    if (params.feedbackForwardingEmailAddress)
      body.FeedbackForwardingEmailAddress = params.feedbackForwardingEmailAddress;
    if (params.emailTags)
      body.EmailTags = params.emailTags.map(t => ({ Name: t.name, Value: t.value }));
    if (params.configurationSetName) body.ConfigurationSetName = params.configurationSetName;
    if (params.listManagementOptions) {
      body.ListManagementOptions = {
        ContactListName: params.listManagementOptions.contactListName
      };
      if (params.listManagementOptions.topicName) {
        body.ListManagementOptions.TopicName = params.listManagementOptions.topicName;
      }
    }

    let result = await this.request<{ MessageId: string }>(
      'POST',
      '/v2/email/outbound-emails',
      body
    );
    return { messageId: result.MessageId };
  }

  async sendBulkEmail(params: {
    fromEmailAddress?: string;
    replyToAddresses?: string[];
    feedbackForwardingEmailAddress?: string;
    defaultEmailTags?: { name: string; value: string }[];
    defaultContent: {
      template: {
        templateName?: string;
        templateArn?: string;
        templateData?: string;
      };
    };
    configurationSetName?: string;
    bulkEmailEntries: {
      destination: {
        toAddresses?: string[];
        ccAddresses?: string[];
        bccAddresses?: string[];
      };
      replacementEmailContent?: {
        replacementTemplate?: {
          replacementTemplateData?: string;
        };
      };
      replacementTags?: { name: string; value: string }[];
    }[];
  }): Promise<{
    bulkEmailEntryResults: { status: string; error?: string; messageId?: string }[];
  }> {
    let body: any = {};

    if (params.fromEmailAddress) body.FromEmailAddress = params.fromEmailAddress;
    if (params.replyToAddresses) body.ReplyToAddresses = params.replyToAddresses;
    if (params.feedbackForwardingEmailAddress)
      body.FeedbackForwardingEmailAddress = params.feedbackForwardingEmailAddress;
    if (params.defaultEmailTags)
      body.DefaultEmailTags = params.defaultEmailTags.map(t => ({
        Name: t.name,
        Value: t.value
      }));
    if (params.configurationSetName) body.ConfigurationSetName = params.configurationSetName;

    body.DefaultContent = { Template: {} };
    let dt = params.defaultContent.template;
    if (dt.templateName) body.DefaultContent.Template.TemplateName = dt.templateName;
    if (dt.templateArn) body.DefaultContent.Template.TemplateArn = dt.templateArn;
    if (dt.templateData) body.DefaultContent.Template.TemplateData = dt.templateData;

    body.BulkEmailEntries = params.bulkEmailEntries.map(entry => {
      let e: any = {
        Destination: {}
      };
      if (entry.destination.toAddresses)
        e.Destination.ToAddresses = entry.destination.toAddresses;
      if (entry.destination.ccAddresses)
        e.Destination.CcAddresses = entry.destination.ccAddresses;
      if (entry.destination.bccAddresses)
        e.Destination.BccAddresses = entry.destination.bccAddresses;

      if (entry.replacementEmailContent?.replacementTemplate?.replacementTemplateData) {
        e.ReplacementEmailContent = {
          ReplacementTemplate: {
            ReplacementTemplateData:
              entry.replacementEmailContent.replacementTemplate.replacementTemplateData
          }
        };
      }
      if (entry.replacementTags) {
        e.ReplacementTags = entry.replacementTags.map(t => ({ Name: t.name, Value: t.value }));
      }
      return e;
    });

    let result = await this.request<{ BulkEmailEntryResults: any[] }>(
      'POST',
      '/v2/email/outbound-bulk-emails',
      body
    );
    return {
      bulkEmailEntryResults: (result.BulkEmailEntryResults || []).map((r: any) => ({
        status: r.Status,
        error: r.Error,
        messageId: r.MessageId
      }))
    };
  }

  // ==================== Email Templates ====================

  async createEmailTemplate(params: {
    templateName: string;
    subject: string;
    html?: string;
    text?: string;
  }): Promise<void> {
    let body: any = {
      TemplateName: params.templateName,
      TemplateContent: {
        Subject: params.subject
      }
    };
    if (params.html) body.TemplateContent.Html = params.html;
    if (params.text) body.TemplateContent.Text = params.text;
    await this.request('POST', '/v2/email/templates', body);
  }

  async getEmailTemplate(templateName: string): Promise<{
    templateName: string;
    subject: string;
    html?: string;
    text?: string;
  }> {
    let result = await this.request<any>(
      'GET',
      `/v2/email/templates/${encodeURIComponent(templateName)}`
    );
    return {
      templateName: result.TemplateName,
      subject: result.TemplateContent?.Subject,
      html: result.TemplateContent?.Html,
      text: result.TemplateContent?.Text
    };
  }

  async updateEmailTemplate(params: {
    templateName: string;
    subject: string;
    html?: string;
    text?: string;
  }): Promise<void> {
    let body: any = {
      TemplateContent: {
        Subject: params.subject
      }
    };
    if (params.html) body.TemplateContent.Html = params.html;
    if (params.text) body.TemplateContent.Text = params.text;
    await this.request(
      'PUT',
      `/v2/email/templates/${encodeURIComponent(params.templateName)}`,
      body
    );
  }

  async deleteEmailTemplate(templateName: string): Promise<void> {
    await this.request('DELETE', `/v2/email/templates/${encodeURIComponent(templateName)}`);
  }

  async listEmailTemplates(params?: { nextToken?: string; pageSize?: number }): Promise<{
    templates: { templateName: string; createdTimestamp: string }[];
    nextToken?: string;
  }> {
    let query: Record<string, string> = {};
    if (params?.nextToken) query.NextToken = params.nextToken;
    if (params?.pageSize) query.PageSize = String(params.pageSize);

    let result = await this.request<any>('GET', '/v2/email/templates', undefined, query);
    return {
      templates: (result.TemplatesMetadata || []).map((t: any) => ({
        templateName: t.TemplateName,
        createdTimestamp: t.CreatedTimestamp
      })),
      nextToken: result.NextToken
    };
  }

  async testRenderEmailTemplate(
    templateName: string,
    templateData: string
  ): Promise<{ renderedTemplate: string }> {
    let body = { TemplateData: templateData };
    let result = await this.request<any>(
      'POST',
      `/v2/email/templates/${encodeURIComponent(templateName)}/render`,
      body
    );
    return { renderedTemplate: result.RenderedTemplate };
  }

  // ==================== Contact Lists ====================

  async createContactList(params: {
    contactListName: string;
    description?: string;
    topics?: {
      topicName: string;
      displayName: string;
      description?: string;
      defaultSubscriptionStatus: 'OPT_IN' | 'OPT_OUT';
    }[];
  }): Promise<void> {
    let body: any = {
      ContactListName: params.contactListName
    };
    if (params.description) body.Description = params.description;
    if (params.topics) {
      body.Topics = params.topics.map(t => ({
        TopicName: t.topicName,
        DisplayName: t.displayName,
        Description: t.description,
        DefaultSubscriptionStatus: t.defaultSubscriptionStatus
      }));
    }
    await this.request('POST', '/v2/email/contact-lists', body);
  }

  async getContactList(contactListName: string): Promise<{
    contactListName: string;
    description?: string;
    topics?: {
      topicName: string;
      displayName: string;
      description?: string;
      defaultSubscriptionStatus: string;
    }[];
    createdTimestamp?: string;
    lastUpdatedTimestamp?: string;
  }> {
    let result = await this.request<any>(
      'GET',
      `/v2/email/contact-lists/${encodeURIComponent(contactListName)}`
    );
    return {
      contactListName: result.ContactListName,
      description: result.Description,
      topics: result.Topics?.map((t: any) => ({
        topicName: t.TopicName,
        displayName: t.DisplayName,
        description: t.Description,
        defaultSubscriptionStatus: t.DefaultSubscriptionStatus
      })),
      createdTimestamp: result.CreatedTimestamp,
      lastUpdatedTimestamp: result.LastUpdatedTimestamp
    };
  }

  async updateContactList(params: {
    contactListName: string;
    description?: string;
    topics?: {
      topicName: string;
      displayName: string;
      description?: string;
      defaultSubscriptionStatus: 'OPT_IN' | 'OPT_OUT';
    }[];
  }): Promise<void> {
    let body: any = {};
    if (params.description !== undefined) body.Description = params.description;
    if (params.topics) {
      body.Topics = params.topics.map(t => ({
        TopicName: t.topicName,
        DisplayName: t.displayName,
        Description: t.description,
        DefaultSubscriptionStatus: t.defaultSubscriptionStatus
      }));
    }
    await this.request(
      'PUT',
      `/v2/email/contact-lists/${encodeURIComponent(params.contactListName)}`,
      body
    );
  }

  async deleteContactList(contactListName: string): Promise<void> {
    await this.request(
      'DELETE',
      `/v2/email/contact-lists/${encodeURIComponent(contactListName)}`
    );
  }

  async listContactLists(params?: { nextToken?: string; pageSize?: number }): Promise<{
    contactLists: { contactListName: string; lastUpdatedTimestamp?: string }[];
    nextToken?: string;
  }> {
    let query: Record<string, string> = {};
    if (params?.nextToken) query.NextToken = params.nextToken;
    if (params?.pageSize) query.PageSize = String(params.pageSize);

    let result = await this.request<any>('GET', '/v2/email/contact-lists', undefined, query);
    return {
      contactLists: (result.ContactLists || []).map((c: any) => ({
        contactListName: c.ContactListName,
        lastUpdatedTimestamp: c.LastUpdatedTimestamp
      })),
      nextToken: result.NextToken
    };
  }

  // ==================== Contacts ====================

  async createContact(params: {
    contactListName: string;
    emailAddress: string;
    topicPreferences?: { topicName: string; subscriptionStatus: 'OPT_IN' | 'OPT_OUT' }[];
    unsubscribeAll?: boolean;
    attributesData?: string;
  }): Promise<void> {
    let body: any = {
      EmailAddress: params.emailAddress
    };
    if (params.topicPreferences) {
      body.TopicPreferences = params.topicPreferences.map(t => ({
        TopicName: t.topicName,
        SubscriptionStatus: t.subscriptionStatus
      }));
    }
    if (params.unsubscribeAll !== undefined) body.UnsubscribeAll = params.unsubscribeAll;
    if (params.attributesData) body.AttributesData = params.attributesData;
    await this.request(
      'POST',
      `/v2/email/contact-lists/${encodeURIComponent(params.contactListName)}/contacts`,
      body
    );
  }

  async getContact(
    contactListName: string,
    emailAddress: string
  ): Promise<{
    contactListName: string;
    emailAddress: string;
    topicPreferences?: { topicName: string; subscriptionStatus: string }[];
    topicDefaultPreferences?: { topicName: string; subscriptionStatus: string }[];
    unsubscribeAll: boolean;
    attributesData?: string;
    createdTimestamp?: string;
    lastUpdatedTimestamp?: string;
  }> {
    let result = await this.request<any>(
      'GET',
      `/v2/email/contact-lists/${encodeURIComponent(contactListName)}/contacts/${encodeURIComponent(emailAddress)}`
    );
    return {
      contactListName: result.ContactListName,
      emailAddress: result.EmailAddress,
      topicPreferences: result.TopicPreferences?.map((t: any) => ({
        topicName: t.TopicName,
        subscriptionStatus: t.SubscriptionStatus
      })),
      topicDefaultPreferences: result.TopicDefaultPreferences?.map((t: any) => ({
        topicName: t.TopicName,
        subscriptionStatus: t.SubscriptionStatus
      })),
      unsubscribeAll: result.UnsubscribeAll || false,
      attributesData: result.AttributesData,
      createdTimestamp: result.CreatedTimestamp,
      lastUpdatedTimestamp: result.LastUpdatedTimestamp
    };
  }

  async updateContact(params: {
    contactListName: string;
    emailAddress: string;
    topicPreferences?: { topicName: string; subscriptionStatus: 'OPT_IN' | 'OPT_OUT' }[];
    unsubscribeAll?: boolean;
    attributesData?: string;
  }): Promise<void> {
    let body: any = {};
    if (params.topicPreferences) {
      body.TopicPreferences = params.topicPreferences.map(t => ({
        TopicName: t.topicName,
        SubscriptionStatus: t.subscriptionStatus
      }));
    }
    if (params.unsubscribeAll !== undefined) body.UnsubscribeAll = params.unsubscribeAll;
    if (params.attributesData !== undefined) body.AttributesData = params.attributesData;
    await this.request(
      'PUT',
      `/v2/email/contact-lists/${encodeURIComponent(params.contactListName)}/contacts/${encodeURIComponent(params.emailAddress)}`,
      body
    );
  }

  async deleteContact(contactListName: string, emailAddress: string): Promise<void> {
    await this.request(
      'DELETE',
      `/v2/email/contact-lists/${encodeURIComponent(contactListName)}/contacts/${encodeURIComponent(emailAddress)}`
    );
  }

  async listContacts(params: {
    contactListName: string;
    nextToken?: string;
    pageSize?: number;
  }): Promise<{
    contacts: {
      emailAddress: string;
      topicPreferences?: { topicName: string; subscriptionStatus: string }[];
      topicDefaultPreferences?: { topicName: string; subscriptionStatus: string }[];
      unsubscribeAll: boolean;
      lastUpdatedTimestamp?: string;
    }[];
    nextToken?: string;
  }> {
    let query: Record<string, string> = {};
    if (params.nextToken) query.NextToken = params.nextToken;
    if (params.pageSize) query.PageSize = String(params.pageSize);

    let result = await this.request<any>(
      'GET',
      `/v2/email/contact-lists/${encodeURIComponent(params.contactListName)}/contacts`,
      undefined,
      query
    );
    return {
      contacts: (result.Contacts || []).map((c: any) => ({
        emailAddress: c.EmailAddress,
        topicPreferences: c.TopicPreferences?.map((t: any) => ({
          topicName: t.TopicName,
          subscriptionStatus: t.SubscriptionStatus
        })),
        topicDefaultPreferences: c.TopicDefaultPreferences?.map((t: any) => ({
          topicName: t.TopicName,
          subscriptionStatus: t.SubscriptionStatus
        })),
        unsubscribeAll: c.UnsubscribeAll || false,
        lastUpdatedTimestamp: c.LastUpdatedTimestamp
      })),
      nextToken: result.NextToken
    };
  }

  // ==================== Email Identities ====================

  async createEmailIdentity(params: {
    emailIdentity: string;
    configurationSetName?: string;
    dkimSigningAttributes?: {
      domainSigningSelector?: string;
      domainSigningPrivateKey?: string;
      nextSigningKeyLength?: 'RSA_1024_BIT' | 'RSA_2048_BIT';
    };
  }): Promise<{
    identityType: string;
    verifiedForSendingStatus: boolean;
    dkimAttributes?: {
      signingEnabled: boolean;
      status: string;
      tokens?: string[];
      signingAttributesOrigin?: string;
      nextSigningKeyLength?: string;
      currentSigningKeyLength?: string;
    };
  }> {
    let body: any = { EmailIdentity: params.emailIdentity };
    if (params.configurationSetName) body.ConfigurationSetName = params.configurationSetName;
    if (params.dkimSigningAttributes) {
      body.DkimSigningAttributes = {};
      if (params.dkimSigningAttributes.domainSigningSelector) {
        body.DkimSigningAttributes.DomainSigningSelector =
          params.dkimSigningAttributes.domainSigningSelector;
      }
      if (params.dkimSigningAttributes.domainSigningPrivateKey) {
        body.DkimSigningAttributes.DomainSigningPrivateKey =
          params.dkimSigningAttributes.domainSigningPrivateKey;
      }
      if (params.dkimSigningAttributes.nextSigningKeyLength) {
        body.DkimSigningAttributes.NextSigningKeyLength =
          params.dkimSigningAttributes.nextSigningKeyLength;
      }
    }

    let result = await this.request<any>('POST', '/v2/email/identities', body);
    return {
      identityType: result.IdentityType,
      verifiedForSendingStatus: result.VerifiedForSendingStatus || false,
      dkimAttributes: result.DkimAttributes
        ? {
            signingEnabled: result.DkimAttributes.SigningEnabled,
            status: result.DkimAttributes.Status,
            tokens: result.DkimAttributes.Tokens,
            signingAttributesOrigin: result.DkimAttributes.SigningAttributesOrigin,
            nextSigningKeyLength: result.DkimAttributes.NextSigningKeyLength,
            currentSigningKeyLength: result.DkimAttributes.CurrentSigningKeyLength
          }
        : undefined
    };
  }

  async getEmailIdentity(emailIdentity: string): Promise<{
    identityType: string;
    verifiedForSendingStatus: boolean;
    feedbackForwardingStatus: boolean;
    dkimAttributes?: {
      signingEnabled: boolean;
      status: string;
      tokens?: string[];
      signingAttributesOrigin?: string;
    };
    mailFromAttributes?: {
      mailFromDomain?: string;
      mailFromDomainStatus?: string;
      behaviorOnMxFailure?: string;
    };
    configurationSetName?: string;
  }> {
    let result = await this.request<any>(
      'GET',
      `/v2/email/identities/${encodeURIComponent(emailIdentity)}`
    );
    return {
      identityType: result.IdentityType,
      verifiedForSendingStatus: result.VerifiedForSendingStatus || false,
      feedbackForwardingStatus: result.FeedbackForwardingStatus || false,
      dkimAttributes: result.DkimAttributes
        ? {
            signingEnabled: result.DkimAttributes.SigningEnabled,
            status: result.DkimAttributes.Status,
            tokens: result.DkimAttributes.Tokens,
            signingAttributesOrigin: result.DkimAttributes.SigningAttributesOrigin
          }
        : undefined,
      mailFromAttributes: result.MailFromAttributes
        ? {
            mailFromDomain: result.MailFromAttributes.MailFromDomain,
            mailFromDomainStatus: result.MailFromAttributes.MailFromDomainStatus,
            behaviorOnMxFailure: result.MailFromAttributes.BehaviorOnMxFailure
          }
        : undefined,
      configurationSetName: result.ConfigurationSetName
    };
  }

  async deleteEmailIdentity(emailIdentity: string): Promise<void> {
    await this.request('DELETE', `/v2/email/identities/${encodeURIComponent(emailIdentity)}`);
  }

  async listEmailIdentities(params?: { nextToken?: string; pageSize?: number }): Promise<{
    identities: {
      identityType: string;
      identityName: string;
      sendingEnabled: boolean;
      verificationStatus?: string;
    }[];
    nextToken?: string;
  }> {
    let query: Record<string, string> = {};
    if (params?.nextToken) query.NextToken = params.nextToken;
    if (params?.pageSize) query.PageSize = String(params.pageSize);

    let result = await this.request<any>('GET', '/v2/email/identities', undefined, query);
    return {
      identities: (result.EmailIdentities || []).map((i: any) => ({
        identityType: i.IdentityType,
        identityName: i.IdentityName,
        sendingEnabled: i.SendingEnabled || false,
        verificationStatus: i.VerificationStatus
      })),
      nextToken: result.NextToken
    };
  }

  async putEmailIdentityDkimAttributes(
    emailIdentity: string,
    signingEnabled: boolean
  ): Promise<void> {
    await this.request(
      'PUT',
      `/v2/email/identities/${encodeURIComponent(emailIdentity)}/dkim`,
      {
        SigningEnabled: signingEnabled
      }
    );
  }

  async putEmailIdentityMailFromAttributes(
    emailIdentity: string,
    mailFromDomain?: string,
    behaviorOnMxFailure?: 'USE_DEFAULT_VALUE' | 'REJECT_MESSAGE'
  ): Promise<void> {
    let body: any = {};
    if (mailFromDomain !== undefined) body.MailFromDomain = mailFromDomain;
    if (behaviorOnMxFailure) body.BehaviorOnMxFailure = behaviorOnMxFailure;
    await this.request(
      'PUT',
      `/v2/email/identities/${encodeURIComponent(emailIdentity)}/mail-from`,
      body
    );
  }

  async putEmailIdentityFeedbackAttributes(
    emailIdentity: string,
    emailForwardingEnabled: boolean
  ): Promise<void> {
    await this.request(
      'PUT',
      `/v2/email/identities/${encodeURIComponent(emailIdentity)}/feedback`,
      {
        EmailForwardingEnabled: emailForwardingEnabled
      }
    );
  }

  // ==================== Suppression List ====================

  async putSuppressedDestination(
    emailAddress: string,
    reason: 'BOUNCE' | 'COMPLAINT'
  ): Promise<void> {
    await this.request('PUT', '/v2/email/suppression/addresses', {
      EmailAddress: emailAddress,
      Reason: reason
    });
  }

  async getSuppressedDestination(emailAddress: string): Promise<{
    emailAddress: string;
    reason: string;
    lastUpdateTime: string;
    attributes?: { messageId?: string; feedbackId?: string };
  }> {
    let result = await this.request<any>(
      'GET',
      `/v2/email/suppression/addresses/${encodeURIComponent(emailAddress)}`
    );
    let dest = result.SuppressedDestination;
    return {
      emailAddress: dest.EmailAddress,
      reason: dest.Reason,
      lastUpdateTime: dest.LastUpdateTime,
      attributes: dest.Attributes
        ? {
            messageId: dest.Attributes.MessageId,
            feedbackId: dest.Attributes.FeedbackId
          }
        : undefined
    };
  }

  async deleteSuppressedDestination(emailAddress: string): Promise<void> {
    await this.request(
      'DELETE',
      `/v2/email/suppression/addresses/${encodeURIComponent(emailAddress)}`
    );
  }

  async listSuppressedDestinations(params?: {
    nextToken?: string;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
    reasons?: ('BOUNCE' | 'COMPLAINT')[];
  }): Promise<{
    suppressedDestinations: {
      emailAddress: string;
      reason: string;
      lastUpdateTime: string;
    }[];
    nextToken?: string;
  }> {
    let query: Record<string, string> = {};
    if (params?.nextToken) query.NextToken = params.nextToken;
    if (params?.pageSize) query.PageSize = String(params.pageSize);
    if (params?.startDate) query.StartDate = params.startDate;
    if (params?.endDate) query.EndDate = params.endDate;
    if (params?.reasons && params.reasons.length > 0) {
      query.Reasons = params.reasons.join(',');
    }

    let result = await this.request<any>(
      'GET',
      '/v2/email/suppression/addresses',
      undefined,
      query
    );
    return {
      suppressedDestinations: (result.SuppressedDestinationSummaries || []).map((s: any) => ({
        emailAddress: s.EmailAddress,
        reason: s.Reason,
        lastUpdateTime: s.LastUpdateTime
      })),
      nextToken: result.NextToken
    };
  }

  // ==================== Configuration Sets ====================

  async createConfigurationSet(params: {
    configurationSetName: string;
    deliveryOptions?: {
      sendingPoolName?: string;
      tlsPolicy?: 'REQUIRE' | 'OPTIONAL';
    };
    reputationOptions?: {
      reputationMetricsEnabled?: boolean;
      lastFreshStart?: string;
    };
    sendingOptions?: {
      sendingEnabled?: boolean;
    };
    trackingOptions?: {
      customRedirectDomain?: string;
    };
    suppressionOptions?: {
      suppressedReasons?: ('BOUNCE' | 'COMPLAINT')[];
    };
  }): Promise<void> {
    let body: any = {
      ConfigurationSetName: params.configurationSetName
    };
    if (params.deliveryOptions) {
      body.DeliveryOptions = {};
      if (params.deliveryOptions.sendingPoolName)
        body.DeliveryOptions.SendingPoolName = params.deliveryOptions.sendingPoolName;
      if (params.deliveryOptions.tlsPolicy)
        body.DeliveryOptions.TlsPolicy = params.deliveryOptions.tlsPolicy;
    }
    if (params.reputationOptions) {
      body.ReputationOptions = {};
      if (params.reputationOptions.reputationMetricsEnabled !== undefined) {
        body.ReputationOptions.ReputationMetricsEnabled =
          params.reputationOptions.reputationMetricsEnabled;
      }
      if (params.reputationOptions.lastFreshStart) {
        body.ReputationOptions.LastFreshStart = params.reputationOptions.lastFreshStart;
      }
    }
    if (params.sendingOptions) {
      body.SendingOptions = {};
      if (params.sendingOptions.sendingEnabled !== undefined) {
        body.SendingOptions.SendingEnabled = params.sendingOptions.sendingEnabled;
      }
    }
    if (params.trackingOptions) {
      body.TrackingOptions = {};
      if (params.trackingOptions.customRedirectDomain) {
        body.TrackingOptions.CustomRedirectDomain =
          params.trackingOptions.customRedirectDomain;
      }
    }
    if (params.suppressionOptions) {
      body.SuppressionOptions = {};
      if (params.suppressionOptions.suppressedReasons) {
        body.SuppressionOptions.SuppressedReasons =
          params.suppressionOptions.suppressedReasons;
      }
    }
    await this.request('POST', '/v2/email/configuration-sets', body);
  }

  async getConfigurationSet(configurationSetName: string): Promise<{
    configurationSetName: string;
    deliveryOptions?: {
      sendingPoolName?: string;
      tlsPolicy?: string;
    };
    reputationOptions?: {
      reputationMetricsEnabled?: boolean;
      lastFreshStart?: string;
    };
    sendingOptions?: {
      sendingEnabled?: boolean;
    };
    trackingOptions?: {
      customRedirectDomain?: string;
    };
    suppressionOptions?: {
      suppressedReasons?: string[];
    };
  }> {
    let result = await this.request<any>(
      'GET',
      `/v2/email/configuration-sets/${encodeURIComponent(configurationSetName)}`
    );
    return {
      configurationSetName: result.ConfigurationSetName,
      deliveryOptions: result.DeliveryOptions
        ? {
            sendingPoolName: result.DeliveryOptions.SendingPoolName,
            tlsPolicy: result.DeliveryOptions.TlsPolicy
          }
        : undefined,
      reputationOptions: result.ReputationOptions
        ? {
            reputationMetricsEnabled: result.ReputationOptions.ReputationMetricsEnabled,
            lastFreshStart: result.ReputationOptions.LastFreshStart
          }
        : undefined,
      sendingOptions: result.SendingOptions
        ? { sendingEnabled: result.SendingOptions.SendingEnabled }
        : undefined,
      trackingOptions: result.TrackingOptions
        ? { customRedirectDomain: result.TrackingOptions.CustomRedirectDomain }
        : undefined,
      suppressionOptions: result.SuppressionOptions
        ? { suppressedReasons: result.SuppressionOptions.SuppressedReasons }
        : undefined
    };
  }

  async deleteConfigurationSet(configurationSetName: string): Promise<void> {
    await this.request(
      'DELETE',
      `/v2/email/configuration-sets/${encodeURIComponent(configurationSetName)}`
    );
  }

  async listConfigurationSets(params?: { nextToken?: string; pageSize?: number }): Promise<{
    configurationSets: string[];
    nextToken?: string;
  }> {
    let query: Record<string, string> = {};
    if (params?.nextToken) query.NextToken = params.nextToken;
    if (params?.pageSize) query.PageSize = String(params.pageSize);

    let result = await this.request<any>(
      'GET',
      '/v2/email/configuration-sets',
      undefined,
      query
    );
    return {
      configurationSets: result.ConfigurationSets || [],
      nextToken: result.NextToken
    };
  }

  async putConfigurationSetSendingOptions(
    configurationSetName: string,
    sendingEnabled: boolean
  ): Promise<void> {
    await this.request(
      'PUT',
      `/v2/email/configuration-sets/${encodeURIComponent(configurationSetName)}/sending-options`,
      {
        SendingEnabled: sendingEnabled
      }
    );
  }

  async putConfigurationSetReputationOptions(
    configurationSetName: string,
    reputationMetricsEnabled: boolean
  ): Promise<void> {
    await this.request(
      'PUT',
      `/v2/email/configuration-sets/${encodeURIComponent(configurationSetName)}/reputation-options`,
      {
        ReputationMetricsEnabled: reputationMetricsEnabled
      }
    );
  }

  async putConfigurationSetTrackingOptions(
    configurationSetName: string,
    customRedirectDomain?: string
  ): Promise<void> {
    let body: any = {};
    if (customRedirectDomain !== undefined) body.CustomRedirectDomain = customRedirectDomain;
    await this.request(
      'PUT',
      `/v2/email/configuration-sets/${encodeURIComponent(configurationSetName)}/tracking-options`,
      body
    );
  }

  async putConfigurationSetSuppressionOptions(
    configurationSetName: string,
    suppressedReasons?: ('BOUNCE' | 'COMPLAINT')[]
  ): Promise<void> {
    let body: any = {};
    if (suppressedReasons) body.SuppressedReasons = suppressedReasons;
    await this.request(
      'PUT',
      `/v2/email/configuration-sets/${encodeURIComponent(configurationSetName)}/suppression-options`,
      body
    );
  }

  // ==================== Configuration Set Event Destinations ====================

  async createConfigurationSetEventDestination(params: {
    configurationSetName: string;
    eventDestinationName: string;
    matchingEventTypes: string[];
    snsDestination?: { topicArn: string };
    cloudWatchDestination?: {
      dimensionConfigurations: {
        dimensionName: string;
        dimensionValueSource: 'MESSAGE_TAG' | 'EMAIL_HEADER' | 'LINK_TAG';
        defaultDimensionValue: string;
      }[];
    };
    eventBridgeDestination?: { eventBusArn: string };
  }): Promise<void> {
    let body: any = {
      EventDestinationName: params.eventDestinationName,
      EventDestination: {
        MatchingEventTypes: params.matchingEventTypes,
        Enabled: true
      }
    };
    if (params.snsDestination) {
      body.EventDestination.SnsDestination = { TopicArn: params.snsDestination.topicArn };
    }
    if (params.cloudWatchDestination) {
      body.EventDestination.CloudWatchDestination = {
        DimensionConfigurations: params.cloudWatchDestination.dimensionConfigurations.map(
          d => ({
            DimensionName: d.dimensionName,
            DimensionValueSource: d.dimensionValueSource,
            DefaultDimensionValue: d.defaultDimensionValue
          })
        )
      };
    }
    if (params.eventBridgeDestination) {
      body.EventDestination.EventBridgeDestination = {
        EventBusArn: params.eventBridgeDestination.eventBusArn
      };
    }
    await this.request(
      'POST',
      `/v2/email/configuration-sets/${encodeURIComponent(params.configurationSetName)}/event-destinations`,
      body
    );
  }

  async getConfigurationSetEventDestinations(configurationSetName: string): Promise<{
    eventDestinations: {
      name: string;
      enabled: boolean;
      matchingEventTypes: string[];
      snsDestination?: { topicArn: string };
      cloudWatchDestination?: any;
      eventBridgeDestination?: { eventBusArn: string };
    }[];
  }> {
    let result = await this.request<any>(
      'GET',
      `/v2/email/configuration-sets/${encodeURIComponent(configurationSetName)}/event-destinations`
    );
    return {
      eventDestinations: (result.EventDestinations || []).map((d: any) => ({
        name: d.Name,
        enabled: d.Enabled,
        matchingEventTypes: d.MatchingEventTypes,
        snsDestination: d.SnsDestination ? { topicArn: d.SnsDestination.TopicArn } : undefined,
        cloudWatchDestination: d.CloudWatchDestination,
        eventBridgeDestination: d.EventBridgeDestination
          ? { eventBusArn: d.EventBridgeDestination.EventBusArn }
          : undefined
      }))
    };
  }

  async deleteConfigurationSetEventDestination(
    configurationSetName: string,
    eventDestinationName: string
  ): Promise<void> {
    await this.request(
      'DELETE',
      `/v2/email/configuration-sets/${encodeURIComponent(configurationSetName)}/event-destinations/${encodeURIComponent(eventDestinationName)}`
    );
  }

  // ==================== Dedicated IP Pools ====================

  async createDedicatedIpPool(params: {
    poolName: string;
    scalingMode?: 'STANDARD' | 'MANAGED';
  }): Promise<void> {
    let body: any = { PoolName: params.poolName };
    if (params.scalingMode) body.ScalingMode = params.scalingMode;
    await this.request('POST', '/v2/email/dedicated-ip-pools', body);
  }

  async getDedicatedIpPool(poolName: string): Promise<{
    poolName: string;
    scalingMode: string;
  }> {
    let result = await this.request<any>(
      'GET',
      `/v2/email/dedicated-ip-pools/${encodeURIComponent(poolName)}`
    );
    return {
      poolName: result.DedicatedIpPool?.PoolName,
      scalingMode: result.DedicatedIpPool?.ScalingMode
    };
  }

  async deleteDedicatedIpPool(poolName: string): Promise<void> {
    await this.request(
      'DELETE',
      `/v2/email/dedicated-ip-pools/${encodeURIComponent(poolName)}`
    );
  }

  async listDedicatedIpPools(params?: { nextToken?: string; pageSize?: number }): Promise<{
    dedicatedIpPools: string[];
    nextToken?: string;
  }> {
    let query: Record<string, string> = {};
    if (params?.nextToken) query.NextToken = params.nextToken;
    if (params?.pageSize) query.PageSize = String(params.pageSize);

    let result = await this.request<any>(
      'GET',
      '/v2/email/dedicated-ip-pools',
      undefined,
      query
    );
    return {
      dedicatedIpPools: result.DedicatedIpPools || [],
      nextToken: result.NextToken
    };
  }

  // ==================== Account ====================

  async getAccount(): Promise<{
    dedicatedIpAutoWarmupEnabled: boolean;
    enforcementStatus: string;
    productionAccessEnabled: boolean;
    sendingEnabled: boolean;
    sendQuota: {
      max24HourSend: number;
      maxSendRate: number;
      sentLast24Hours: number;
    };
    suppressionAttributes?: {
      suppressedReasons: string[];
    };
    vdmAttributes?: {
      vdmEnabled: string;
      dashboardAttributes?: { engagementMetrics: string };
      guardianAttributes?: { optimizedSharedDelivery: string };
    };
  }> {
    let result = await this.request<any>('GET', '/v2/email/account');
    return {
      dedicatedIpAutoWarmupEnabled: result.DedicatedIpAutoWarmupEnabled || false,
      enforcementStatus: result.EnforcementStatus || 'HEALTHY',
      productionAccessEnabled: result.ProductionAccessEnabled || false,
      sendingEnabled: result.SendingEnabled || false,
      sendQuota: {
        max24HourSend: result.SendQuota?.Max24HourSend || 0,
        maxSendRate: result.SendQuota?.MaxSendRate || 0,
        sentLast24Hours: result.SendQuota?.SentLast24Hours || 0
      },
      suppressionAttributes: result.SuppressionAttributes
        ? { suppressedReasons: result.SuppressionAttributes.SuppressedReasons || [] }
        : undefined,
      vdmAttributes: result.VdmAttributes
        ? {
            vdmEnabled: result.VdmAttributes.VdmEnabled,
            dashboardAttributes: result.VdmAttributes.DashboardAttributes
              ? {
                  engagementMetrics: result.VdmAttributes.DashboardAttributes.EngagementMetrics
                }
              : undefined,
            guardianAttributes: result.VdmAttributes.GuardianAttributes
              ? {
                  optimizedSharedDelivery:
                    result.VdmAttributes.GuardianAttributes.OptimizedSharedDelivery
                }
              : undefined
          }
        : undefined
    };
  }

  async putAccountSendingAttributes(sendingEnabled: boolean): Promise<void> {
    await this.request('PUT', '/v2/email/account/sending', {
      SendingEnabled: sendingEnabled
    });
  }

  // ==================== Message Insights ====================

  async getMessageInsights(messageId: string): Promise<{
    messageId: string;
    fromEmailAddress?: string;
    subject?: string;
    emailTags?: { name: string; value: string }[];
    insights?: {
      destination?: string;
      isp?: string;
      events?: {
        timestamp?: string;
        type?: string;
        details?: any;
      }[];
    }[];
  }> {
    let result = await this.request<any>(
      'GET',
      `/v2/email/insights/${encodeURIComponent(messageId)}`
    );
    return {
      messageId: result.MessageId,
      fromEmailAddress: result.FromEmailAddress,
      subject: result.Subject,
      emailTags: result.EmailTags?.map((t: any) => ({ name: t.Name, value: t.Value })),
      insights: result.Insights?.map((i: any) => ({
        destination: i.Destination,
        isp: i.Isp,
        events: i.Events?.map((e: any) => ({
          timestamp: e.Timestamp,
          type: e.Type,
          details: e.Details
        }))
      }))
    };
  }
}
