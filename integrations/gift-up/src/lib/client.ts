import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  testMode?: boolean;
}

export class Client {
  private axios;

  constructor(private config: ClientConfig) {
    this.axios = createAxios({
      baseURL: 'https://api.giftup.app'
    });
  }

  private getHeaders() {
    let headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.token}`,
      Accept: 'application/json'
    };
    if (this.config.testMode) {
      headers['x-giftup-testmode'] = 'true';
    }
    return headers;
  }

  private getJsonHeaders() {
    return {
      ...this.getHeaders(),
      'Content-Type': 'application/json'
    };
  }

  private getPatchHeaders() {
    return {
      ...this.getHeaders(),
      'Content-Type': 'application/json-patch+json'
    };
  }

  // ==================== Company ====================

  async getCompany() {
    let response = await this.axios.get('/company', { headers: this.getHeaders() });
    return response.data;
  }

  // ==================== Gift Cards ====================

  async listGiftCards(
    params: {
      status?: string;
      createdOnOrAfter?: string;
      updatedOnOrAfter?: string;
      orderId?: string;
      sku?: string;
      recipientEmail?: string;
      purchaserEmail?: string;
      paymentTransactionId?: string;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    let response = await this.axios.get('/gift-cards', {
      headers: this.getHeaders(),
      params
    });
    return response.data;
  }

  async getGiftCard(code: string) {
    let response = await this.axios.get(`/gift-cards/${encodeURIComponent(code)}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async updateGiftCard(
    code: string,
    patches: Array<{ op: string; path: string; value: any }>
  ) {
    let response = await this.axios.patch(`/gift-cards/${encodeURIComponent(code)}`, patches, {
      headers: this.getPatchHeaders()
    });
    return response.data;
  }

  async redeemGiftCard(
    code: string,
    body: {
      amount?: number;
      units?: number;
      reason?: string;
      locationId?: string;
      metadata?: Record<string, string>;
    }
  ) {
    let response = await this.axios.post(
      `/gift-cards/${encodeURIComponent(code)}/redeem`,
      body,
      { headers: this.getJsonHeaders() }
    );
    return response.data;
  }

  async redeemGiftCardInFull(
    code: string,
    body: {
      reason?: string;
      locationId?: string;
      metadata?: Record<string, string>;
    } = {}
  ) {
    let response = await this.axios.post(
      `/gift-cards/${encodeURIComponent(code)}/redeem-in-full`,
      body,
      { headers: this.getJsonHeaders() }
    );
    return response.data;
  }

  async undoRedemption(
    code: string,
    body: {
      transactionId: string;
      reason?: string;
      metadata?: Record<string, string>;
    }
  ) {
    let response = await this.axios.post(
      `/gift-cards/${encodeURIComponent(code)}/undo-redemption`,
      body,
      { headers: this.getJsonHeaders() }
    );
    return response.data;
  }

  async topUpGiftCard(
    code: string,
    body: {
      amount?: number;
      units?: number;
      reason?: string;
      locationId?: string;
      metadata?: Record<string, string>;
    }
  ) {
    let response = await this.axios.post(
      `/gift-cards/${encodeURIComponent(code)}/top-up`,
      body,
      { headers: this.getJsonHeaders() }
    );
    return response.data;
  }

  async voidGiftCard(
    code: string,
    body: {
      reason?: string;
      locationId?: string;
      metadata?: Record<string, string>;
    } = {}
  ) {
    let response = await this.axios.post(
      `/gift-cards/${encodeURIComponent(code)}/void`,
      body,
      { headers: this.getJsonHeaders() }
    );
    return response.data;
  }

  async reactivateGiftCard(
    code: string,
    body: {
      reason?: string;
      locationId?: string;
      metadata?: Record<string, string>;
    } = {}
  ) {
    let response = await this.axios.post(
      `/gift-cards/${encodeURIComponent(code)}/reactivate`,
      body,
      { headers: this.getJsonHeaders() }
    );
    return response.data;
  }

  async transferBalances(body: {
    sourceGiftCards: string[];
    destinationGiftCard: string;
    reason?: string;
    locationId?: string;
    metadata?: Record<string, string>;
  }) {
    let response = await this.axios.post('/gift-cards/transfer-balances', body, {
      headers: this.getJsonHeaders()
    });
    return response.data;
  }

  // ==================== Orders ====================

  async createOrder(body: {
    orderDate?: string;
    disableAllEmails?: boolean;
    purchaserEmail: string;
    purchaserName: string;
    tip?: number;
    serviceFee?: number;
    discount?: number;
    referrer?: string;
    revenue?: number;
    itemDetails: Array<{
      quantity: number;
      id?: string;
      name?: string;
      description?: string;
      code?: string;
      backingType?: string;
      price?: number;
      value?: number;
      units?: number;
      equivalentValuePerUnit?: number;
      expiresOn?: string;
      expiresInMonths?: number;
      expiresInDays?: number;
      overrideExpiry?: boolean;
      validFrom?: string;
      validFromInDays?: number;
      overrideValidFrom?: boolean;
      sku?: string;
      terms?: string;
    }>;
    recipientDetails?: {
      recipientName?: string;
      recipientEmail?: string;
      message?: string;
      scheduledFor?: string;
      fulfilmentMethod?: string;
      shippingAddress?: {
        address1: string;
        address2?: string;
        city: string;
        state: string;
        postalCode: string;
        countryCode: string;
      };
      shippingOption?: {
        id?: string;
        name?: string;
        price?: number;
      };
    };
    customFields?: Array<{
      label: string;
      value: any;
      showOnGiftCard?: boolean;
      showOnRedeemApp?: boolean;
    }>;
    salesTaxes?: Array<{
      label: string;
      amount: number;
      type: string;
    }>;
    metadata?: Record<string, string>;
  }) {
    let response = await this.axios.post('/orders', body, {
      headers: this.getJsonHeaders()
    });
    return response.data;
  }

  async getOrder(orderId: string) {
    let response = await this.axios.get(`/orders/${encodeURIComponent(orderId)}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async updateOrder(
    orderId: string,
    patches: Array<{ op: string; path: string; value: any }>
  ) {
    let response = await this.axios.patch(`/orders/${encodeURIComponent(orderId)}`, patches, {
      headers: this.getPatchHeaders()
    });
    return response.data;
  }

  async addOrderNote(orderId: string, content: string) {
    let response = await this.axios.post(
      `/orders/${encodeURIComponent(orderId)}/notes`,
      { content },
      { headers: this.getJsonHeaders() }
    );
    return response.data;
  }

  async markOrderPosted(orderId: string, body?: { codes?: string[] }) {
    let response = await this.axios.post(
      `/orders/${encodeURIComponent(orderId)}/post`,
      body || {},
      { headers: this.getJsonHeaders() }
    );
    return response.data;
  }

  // ==================== Items ====================

  async listItems(params: { groupId?: string } = {}) {
    let response = await this.axios.get('/items', {
      headers: this.getHeaders(),
      params
    });
    return response.data;
  }

  async getItem(itemId: string) {
    let response = await this.axios.get(`/items/${encodeURIComponent(itemId)}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async createItem(body: {
    name: string;
    description?: string;
    backingType: string;
    priceType?: string;
    price?: number;
    value?: number;
    units?: number;
    equivalentValuePerUnit?: number;
    minimumPrice?: number;
    maximumPrice?: number;
    availableFrom?: string;
    availableUntil?: string;
    overrideValidFrom?: boolean;
    validFrom?: string;
    validFromInDays?: number;
    overrideExpiry?: boolean;
    expiresOn?: string;
    expiresInMonths?: number;
    expiresInDays?: number;
    groupId?: string;
    detailsURL?: string;
    artworkURL?: string;
    stockLevel?: number;
    codes?: string[];
    perOrderLimit?: number;
    additionalTerms?: string;
    sku?: string;
  }) {
    let response = await this.axios.post('/items', body, {
      headers: this.getJsonHeaders()
    });
    return response.data;
  }

  async updateItem(itemId: string, patches: Array<{ op: string; path: string; value: any }>) {
    let response = await this.axios.patch(`/items/${encodeURIComponent(itemId)}`, patches, {
      headers: this.getPatchHeaders()
    });
    return response.data;
  }

  async deleteItem(itemId: string) {
    let response = await this.axios.delete(`/items/${encodeURIComponent(itemId)}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  // ==================== Item Groups ====================

  async listGroups() {
    let response = await this.axios.get('/groups', {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async getGroup(groupId: string) {
    let response = await this.axios.get(`/groups/${encodeURIComponent(groupId)}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async createGroup(body: {
    name: string;
    description?: string;
    sortOrder?: number;
    autoExpand?: boolean;
  }) {
    let response = await this.axios.post('/groups', body, {
      headers: this.getJsonHeaders()
    });
    return response.data;
  }

  async updateGroup(
    groupId: string,
    patches: Array<{ op: string; path: string; value: any }>
  ) {
    let response = await this.axios.patch(`/groups/${encodeURIComponent(groupId)}`, patches, {
      headers: this.getPatchHeaders()
    });
    return response.data;
  }

  async deleteGroup(groupId: string) {
    let response = await this.axios.delete(`/groups/${encodeURIComponent(groupId)}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  // ==================== Locations ====================

  async listLocations() {
    let response = await this.axios.get('/locations', {
      headers: this.getHeaders()
    });
    return response.data;
  }

  // ==================== Reports ====================

  async listTransactions(
    params: {
      createdOnOrAfter?: string;
      updatedOnOrAfter?: string;
      giftCardCode?: string;
      eventType?: string;
      locationId?: string;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    let response = await this.axios.get('/reports/transactions', {
      headers: this.getHeaders(),
      params
    });
    return response.data;
  }

  async getTransaction(transactionId: string) {
    let response = await this.axios.get(
      `/reports/transactions/${encodeURIComponent(transactionId)}`,
      {
        headers: this.getHeaders()
      }
    );
    return response.data;
  }

  // ==================== Users ====================

  async listUsers() {
    let response = await this.axios.get('/users', {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async getUser(userId: string) {
    let response = await this.axios.get(`/users/${encodeURIComponent(userId)}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async inviteUser(body: {
    email: string;
    name?: string;
    isAdministrator?: boolean;
    pin?: string;
    locationId?: string;
    showOnRedeemApp?: boolean;
  }) {
    let response = await this.axios.post('/users/invite', body, {
      headers: this.getJsonHeaders()
    });
    return response.data;
  }

  async updateUser(userId: string, patches: Array<{ op: string; path: string; value: any }>) {
    let response = await this.axios.patch(`/users/${encodeURIComponent(userId)}`, patches, {
      headers: this.getPatchHeaders()
    });
    return response.data;
  }

  async deleteUser(userId: string) {
    let response = await this.axios.delete(`/users/${encodeURIComponent(userId)}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  // ==================== Webhooks ====================

  async listWebhooks() {
    let response = await this.axios.get('/webhooks', {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async getWebhook(webhookId: string) {
    let response = await this.axios.get(`/webhooks/${encodeURIComponent(webhookId)}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async createWebhook(body: {
    targetUrl: string;
    eventType: string;
    secret?: string;
    testMode?: boolean;
  }) {
    let response = await this.axios.post('/webhooks', body, {
      headers: this.getJsonHeaders()
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    let response = await this.axios.delete(`/webhooks/${encodeURIComponent(webhookId)}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  // ==================== Settings ====================

  async getCheckoutSettings() {
    let response = await this.axios.get('/settings/checkout', {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async updateCheckoutSettings(patches: Array<{ op: string; path: string; value: any }>) {
    let response = await this.axios.patch('/settings/checkout', patches, {
      headers: this.getPatchHeaders()
    });
    return response.data;
  }

  async getEmailSettings() {
    let response = await this.axios.get('/settings/email', {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async updateEmailSettings(patches: Array<{ op: string; path: string; value: any }>) {
    let response = await this.axios.patch('/settings/email', patches, {
      headers: this.getPatchHeaders()
    });
    return response.data;
  }

  async getGiftCardSettings() {
    let response = await this.axios.get('/settings/gift-card', {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async updateGiftCardSettings(patches: Array<{ op: string; path: string; value: any }>) {
    let response = await this.axios.patch('/settings/gift-card', patches, {
      headers: this.getPatchHeaders()
    });
    return response.data;
  }

  async getShippingSettings() {
    let response = await this.axios.get('/settings/shipping', {
      headers: this.getHeaders()
    });
    return response.data;
  }
}
