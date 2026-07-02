import { createAxios } from 'slates';

export class Client {
  private http;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://www.eventzillaapi.net/api/v2',
      headers: {
        'x-api-key': config.token
      }
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
    let response = await this.http.get('/events', { params });
    return response.data;
  }

  async getEvent(eventId: string): Promise<any> {
    let response = await this.http.get(`/events/${eventId}`);
    return response.data;
  }

  async toggleSales(eventId: number, status: boolean): Promise<any> {
    let response = await this.http.post('/events/togglesales', {
      eventid: eventId,
      status
    });
    return response.data;
  }

  // ── Tickets ──

  async getEventTickets(eventId: string): Promise<any> {
    let response = await this.http.get(`/events/${eventId}/tickets`);
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
    let response = await this.http.get(`/events/${eventId}/attendees`, { params });
    return response.data;
  }

  async getAttendee(attendeeId: string): Promise<any> {
    let response = await this.http.get(`/attendees/${attendeeId}`);
    return response.data;
  }

  async checkinAttendee(barcode: string, eventcheckin: boolean): Promise<any> {
    let response = await this.http.post('/attendees/checkin', {
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
    let response = await this.http.get(`/events/${eventId}/transactions`, { params });
    return response.data;
  }

  async getTransaction(transactionIdOrRef: string): Promise<any> {
    let response = await this.http.get(`/transactions/${transactionIdOrRef}`);
    return response.data;
  }

  // ── Orders ──

  async confirmOrder(params: {
    checkoutId: number;
    eventId: number;
    comments: string;
    sendEmail?: boolean;
  }): Promise<any> {
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
    let response = await this.http.post('/events/order/cancel', {
      checkout_id: params.checkoutId,
      eventid: params.eventId,
      comments: params.comments
    });
    return response.data;
  }

  // ── Checkout ──

  async prepareCheckout(eventId: string, dateId: string): Promise<any> {
    let response = await this.http.get(`/checkout/prepare/${eventId}/${dateId}`);
    return response.data;
  }

  async createCheckout(params: {
    eventId: number;
    eventDateId: number;
    ticketTypes: Array<{ ticketTypeId: number; quantity: number }>;
    discountCode?: string;
  }): Promise<any> {
    let response = await this.http.post('/checkout/create', {
      eventid: params.eventId,
      eventdateid: params.eventDateId,
      ticket_types: params.ticketTypes.map(t => ({
        ticket_type_id: t.ticketTypeId,
        quantity: t.quantity
      })),
      ...(params.discountCode ? { discount_code: params.discountCode } : {})
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

  // ── Users ──

  async listUsers(params?: { offset?: number; limit?: number }): Promise<any> {
    let response = await this.http.get('/users/', { params });
    return response.data;
  }

  async getUser(userId: string): Promise<any> {
    let response = await this.http.get(`/users/${userId}`);
    return response.data;
  }
}
