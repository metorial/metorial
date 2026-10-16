import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export let eventzillaApiError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Eventzilla',
    reason: 'eventzilla_api_error',
    detailKeys: ['message', 'error_code', 'detail'],
    nestedKeys: ['errors'],
    extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
    extractUpstreamCode: (_error, response) =>
      isApiErrorRecord(response?.data) && typeof response.data.error_code === 'string'
        ? response.data.error_code
        : undefined
  });

export let validateInteger = (value: number, field: string, minimum = 1) => {
  if (!Number.isSafeInteger(value) || value < minimum)
    throw createApiServiceError(
      `${field} must be a safe integer greater than or equal to ${minimum}.`
    );
};

let resourceId = (value: string, field: string) => {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1)
    throw createApiServiceError(
      `${field} must be a positive integer identifier. Use the list tools to find the identifier.`
    );
  return encodeURIComponent(value);
};

let validatePagination = (params?: { offset?: number; limit?: number }) => {
  if (params?.offset !== undefined) validateInteger(params.offset, 'offset', 0);
  if (params?.limit !== undefined) validateInteger(params.limit, 'limit');
};

export type FreeTicketType = {
  ticketTypeName: string;
  quantityTotal: number;
  ticketTypeDescription: string;
  salesStartDate: string;
  salesEndDate: string;
  salesStartTime: string;
  salesEndTime: string;
  limitMinimum: number;
  limitMaximum: number;
  isVisible: boolean;
  boxofficeOnly: boolean;
  additionalInstructions?: string;
  unlockCode?: string;
};

let freeTicketBody = (input: FreeTicketType) => {
  validateInteger(input.quantityTotal, 'quantityTotal', 0);
  validateInteger(input.limitMinimum, 'limitMinimum', 0);
  validateInteger(input.limitMaximum, 'limitMaximum', 1);
  if (input.limitMinimum > input.limitMaximum)
    throw createApiServiceError('limitMinimum must not exceed limitMaximum.');
  if (!input.ticketTypeName.trim())
    throw createApiServiceError('ticketTypeName must not be empty.');
  return {
    ticket_type_name: input.ticketTypeName,
    quantity_total: input.quantityTotal,
    ticket_type_description: input.ticketTypeDescription,
    sales_start_date: input.salesStartDate,
    sales_end_date: input.salesEndDate,
    sales_start_time: input.salesStartTime,
    sales_end_time: input.salesEndTime,
    limit_minimum: input.limitMinimum,
    limit_maximum: input.limitMaximum,
    is_visible: input.isVisible,
    boxoffice_only: input.boxofficeOnly,
    ...(input.additionalInstructions !== undefined
      ? { additional_instructions: input.additionalInstructions }
      : {}),
    ...(input.unlockCode !== undefined ? { unlock_code: input.unlockCode } : {})
  };
};

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim())
      throw createApiServiceError('An Eventzilla API key is required.');
    this.http = createAuthenticatedAxios({
      baseURL: 'https://www.eventzillaapi.net/api/v2',
      timeout: 30_000,
      errorAdapter: eventzillaApiError,
      authHeader: { name: 'x-api-key', value: config.token },
      headers: {
        Accept: 'application/json'
      }
    });
    this.http.interceptors.response.use(response => {
      if (
        isApiErrorRecord(response.data) &&
        (response.data.error_code ||
          (typeof response.data.status === 'number' && response.data.status >= 400))
      ) {
        throw eventzillaApiError({
          response: { status: response.data.status, data: response.data }
        });
      }
      return response;
    });
  }

  // ── Categories ──

  async getCategories(): Promise<any> {
    let response = await this.http.get('/categories');
    return response.data;
  }

  // ── Events ──

  async listEvents(params?: {
    status?: string;
    category?: string;
    offset?: number;
    limit?: number;
  }): Promise<any> {
    validatePagination(params);
    let response = await this.http.get('/events', { params });
    return response.data;
  }

  async getEvent(eventId: string): Promise<any> {
    let response = await this.http.get(`/events/${resourceId(eventId, 'eventId')}`);
    return response.data;
  }

  async toggleSales(eventId: number, status: boolean): Promise<any> {
    validateInteger(eventId, 'eventId');
    let response = await this.http.post('/events/togglesales', {
      eventid: eventId,
      status
    });
    return response.data;
  }

  // ── Tickets ──

  async getEventTickets(eventId: string): Promise<any> {
    let response = await this.http.get(`/events/${resourceId(eventId, 'eventId')}/tickets`);
    return response.data;
  }

  // ── Attendees ──

  async listEventAttendees(
    eventId: string,
    params?: {
      offset?: number;
      limit?: number;
    }
  ): Promise<any> {
    validatePagination(params);
    let response = await this.http.get(`/events/${resourceId(eventId, 'eventId')}/attendees`, {
      params
    });
    return response.data;
  }

  async getAttendee(attendeeId: string): Promise<any> {
    let response = await this.http.get(`/attendees/${resourceId(attendeeId, 'attendeeId')}`);
    return response.data;
  }

  async checkinAttendee(barcode: string, eventcheckin: boolean): Promise<any> {
    if (!barcode.trim()) throw createApiServiceError('The attendee barcode is required.');
    let response = await this.http.post('/attendee/checkin', {
      barcode,
      eventcheckin
    });
    return response.data;
  }

  // ── Transactions ──

  async listEventTransactions(
    eventId: string,
    params?: {
      offset?: number;
      limit?: number;
    }
  ): Promise<any> {
    validatePagination(params);
    let response = await this.http.get(
      `/events/${resourceId(eventId, 'eventId')}/transactions`,
      { params }
    );
    return response.data;
  }

  async getTransaction(transactionIdOrRef: string): Promise<any> {
    if (!transactionIdOrRef.trim())
      throw createApiServiceError('A checkout ID or order reference is required.');
    let response = await this.http.get(
      `/transactions/${encodeURIComponent(transactionIdOrRef)}`
    );
    return response.data;
  }

  // ── Orders ──

  async confirmOrder(params: {
    checkoutId: number;
    eventId: number;
    comments: string;
    sendEmail?: boolean;
  }): Promise<any> {
    validateInteger(params.eventId, 'eventId');
    validateInteger(params.checkoutId, 'checkoutId');
    let response = await this.http.post('/events/order/confirm', {
      checkout_id: params.checkoutId,
      eventid: params.eventId,
      comments: params.comments,
      ...(params.sendEmail !== undefined ? { sendemail: params.sendEmail } : {})
    });
    return response.data;
  }

  async cancelOrder(params: {
    checkoutId: number;
    eventId: number;
    comments: string;
  }): Promise<any> {
    validateInteger(params.eventId, 'eventId');
    validateInteger(params.checkoutId, 'checkoutId');
    let response = await this.http.post('/events/order/cancel', {
      checkout_id: params.checkoutId,
      eventid: params.eventId,
      comments: params.comments
    });
    return response.data;
  }

  // ── Checkout ──

  async prepareCheckout(eventId: string, dateId: string): Promise<any> {
    let response = await this.http.get(
      `/checkout/prepare/${resourceId(eventId, 'eventId')}/${resourceId(dateId, 'dateId')}`
    );
    return response.data;
  }

  async createCheckout(params: {
    eventId: number;
    eventDateId: number;
    ticketTypes: Array<{ ticketTypeId: number; quantity: number }>;
    discountCode?: string;
  }): Promise<any> {
    validateInteger(params.eventId, 'eventId');
    validateInteger(params.eventDateId, 'eventDateId');
    if (!params.ticketTypes.length)
      throw createApiServiceError('At least one ticket type is required.');
    for (let ticket of params.ticketTypes) {
      validateInteger(ticket.ticketTypeId, 'ticketTypeId');
      validateInteger(ticket.quantity, 'quantity');
    }
    let response = await this.http.post('/checkout/create', {
      eventid: params.eventId,
      eventdateid: params.eventDateId,
      ticket_types: params.ticketTypes.map(t => ({
        ticket_type_id: t.ticketTypeId,
        quantity: t.quantity
      })),
      ...(params.discountCode !== undefined ? { discount_code: params.discountCode } : {})
    });
    return response.data;
  }

  async fillOrder(params: {
    eventId: number;
    eventDateId: number;
    checkoutId: number;
    buyerDetails: {
      firstName: string;
      lastName: string;
      email: string;
    };
    tickets: Array<{
      ticketPriceId: number;
      firstName: string;
      lastName: string;
      email: string;
      answers?: Array<{ questionId: number; answerText: string }>;
    }>;
    paymentId: number;
  }): Promise<any> {
    validateInteger(params.eventId, 'eventId');
    validateInteger(params.checkoutId, 'checkoutId');
    validateInteger(params.eventDateId, 'eventDateId');
    validateInteger(params.paymentId, 'paymentId');
    if (!params.tickets.length)
      throw createApiServiceError('At least one attendee ticket is required.');
    for (let ticket of params.tickets) {
      validateInteger(ticket.ticketPriceId, 'ticketPriceId');
      for (let answer of ticket.answers ?? [])
        validateInteger(answer.questionId, 'questionId');
    }
    let response = await this.http.post('/checkout/fillorder', {
      eventid: params.eventId,
      eventdateid: params.eventDateId,
      checkout_id: params.checkoutId,
      buyerdetails: [
        {
          buyer_firstname: params.buyerDetails.firstName,
          buyer_lastname: params.buyerDetails.lastName,
          buyer_email: params.buyerDetails.email
        }
      ],
      tickets: params.tickets.map(t => ({
        ticket_price_id: t.ticketPriceId,
        first_name: t.firstName,
        last_name: t.lastName,
        email: t.email,
        ...(t.answers
          ? {
              answers: t.answers.map(a => ({
                question_id: a.questionId,
                answer_text: a.answerText
              }))
            }
          : {})
      })),
      payment_id: params.paymentId
    });
    return response.data;
  }

  async confirmCheckout(params: {
    eventId: number;
    eventDateId: number;
    checkoutId: number;
    paymentStatus: string;
    comments: string;
    sendEmail?: boolean;
  }): Promise<any> {
    validateInteger(params.eventId, 'eventId');
    validateInteger(params.checkoutId, 'checkoutId');
    validateInteger(params.eventDateId, 'eventDateId');
    let response = await this.http.post('/checkout/confirm', {
      eventid: params.eventId,
      eventdateid: params.eventDateId,
      checkout_id: params.checkoutId,
      payment_status: params.paymentStatus,
      comments: params.comments,
      ...(params.sendEmail !== undefined ? { sendemail: params.sendEmail } : {})
    });
    return response.data;
  }

  async createFreeTicketType(eventId: string, input: FreeTicketType): Promise<unknown> {
    let response = await this.http.post(
      `/events/${resourceId(eventId, 'eventId')}/ticket-types`,
      freeTicketBody(input)
    );
    return response.data;
  }

  async updateFreeTicketType(
    eventId: string,
    ticketTypeId: string,
    input: FreeTicketType
  ): Promise<unknown> {
    let response = await this.http.patch(
      `/events/${resourceId(eventId, 'eventId')}/ticket-types/${resourceId(ticketTypeId, 'ticketTypeId')}`,
      freeTicketBody(input)
    );
    return response.data;
  }

  // ── Users ──

  async listUsers(params?: { offset?: number; limit?: number }): Promise<any> {
    validatePagination(params);
    let response = await this.http.get('/users', { params });
    return response.data;
  }

  async getUser(userId: string): Promise<any> {
    let response = await this.http.get(`/users/${resourceId(userId, 'userId')}`);
    return response.data;
  }
}
