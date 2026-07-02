import { createAxios } from 'slates';

export interface EveniumEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  creationDate?: string;
  status?: string;
  url?: string;
}

export interface EveniumContact {
  id: string;
  customId?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  email?: string;
  company?: string;
  fields?: Array<{ name: string; value: string }>;
}

export interface EveniumGuest {
  contactId: string;
  eventId: string;
  firstName: string;
  lastName: string;
  gender?: string;
  email: string;
  company?: string;
  lastUpdate?: string;
  status?: string;
  category?: string | { id: string; label: string };
  categoryLabel?: string;
  fields?: Array<{ name: string; value: string; eventOnly?: boolean }>;
}

export interface PaginatedResponse<T> {
  nbrResults: string;
  maxResults: string;
  firstResult: string;
  more: string;
  items: T[];
}

export interface ListEventsParams {
  title?: string;
  status?: string;
  since?: string;
  until?: string;
  firstResult?: number;
  maxResults?: number;
}

export interface ListGuestsParams {
  status?: string;
  since?: string;
  until?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  firstResult?: number;
  maxResults?: number;
}

export interface ListContactsParams {
  lastName?: string;
  firstName?: string;
  email?: string;
  company?: string;
  since?: string;
  firstResult?: number;
  maxResults?: number;
}

export interface CreateEventParams {
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
}

export interface AddGuestParams {
  contactId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  gender?: string;
  company?: string;
  status?: string;
}

export interface CreateContactParams {
  customId?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  email?: string;
  company?: string;
  fields?: Array<{ name: string; value: string }>;
}

export interface UpdateContactParams {
  customId?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  email?: string;
  company?: string;
  fields?: Array<{ name: string; value: string }>;
}

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.http = createAxios({
      baseURL: 'https://secure.evenium.com/api/1',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      params: {
        accessToken: token
      }
    });
  }

  // Events

  async listEvents(
    params?: ListEventsParams
  ): Promise<{ events: EveniumEvent[]; totalCount: string }> {
    let response = await this.http.get('/events', { params });
    let data = response.data;
    let events: EveniumEvent[] = data.events ?? data.event ?? [];
    if (!Array.isArray(events)) {
      events = [events];
    }
    return {
      events,
      totalCount: data.nbrResults ?? String(events.length)
    };
  }

  async getEvent(eventId: string): Promise<EveniumEvent> {
    let response = await this.http.get(`/events/${eventId}`);
    return response.data;
  }

  async createEvent(params: CreateEventParams): Promise<EveniumEvent> {
    let http2 = createAxios({
      baseURL: 'https://secure.evenium.com/api/2',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      params: {
        accessToken: this.http.defaults.params?.accessToken
      }
    });
    let response = await http2.post('/member/events', params);
    return response.data;
  }

  // Guests (Participants)

  async listGuests(
    eventId: string,
    params?: ListGuestsParams
  ): Promise<{ guests: EveniumGuest[]; totalCount: string }> {
    let response = await this.http.get(`/events/${eventId}/guests`, { params });
    let data = response.data;
    let guests: EveniumGuest[] = data.guests ?? data.guest ?? [];
    if (!Array.isArray(guests)) {
      guests = [guests];
    }
    return {
      guests,
      totalCount: data.nbrResults ?? String(guests.length)
    };
  }

  async getGuest(eventId: string, contactId: string): Promise<EveniumGuest> {
    let response = await this.http.get(`/events/${eventId}/guests/${contactId}`);
    return response.data;
  }

  async addGuest(eventId: string, params: AddGuestParams): Promise<EveniumGuest> {
    let response = await this.http.post(`/events/${eventId}/guests`, params);
    return response.data;
  }

  async updateGuest(
    eventId: string,
    contactId: string,
    params: Record<string, unknown>
  ): Promise<EveniumGuest> {
    let response = await this.http.put(`/events/${eventId}/guests/${contactId}`, params);
    return response.data;
  }

  async getGuestStatus(eventId: string, contactId: string): Promise<{ status: string }> {
    let response = await this.http.get(`/events/${eventId}/guests/${contactId}/status`);
    return response.data;
  }

  async updateGuestStatus(
    eventId: string,
    contactId: string,
    status: string
  ): Promise<{ status: string }> {
    let response = await this.http.put(`/events/${eventId}/guests/${contactId}/status`, {
      status
    });
    return response.data;
  }

  // Contacts

  async listContacts(
    params?: ListContactsParams
  ): Promise<{ contacts: EveniumContact[]; totalCount: string }> {
    let response = await this.http.get('/contacts', { params });
    let data = response.data;
    let contacts: EveniumContact[] = data.contacts ?? data.contact ?? [];
    if (!Array.isArray(contacts)) {
      contacts = [contacts];
    }
    return {
      contacts,
      totalCount: data.nbrResults ?? String(contacts.length)
    };
  }

  async getContact(contactId: string): Promise<EveniumContact> {
    let response = await this.http.get(`/contacts/${contactId}`);
    return response.data;
  }

  async createContact(params: CreateContactParams): Promise<EveniumContact> {
    let response = await this.http.post('/contacts', params);
    return response.data;
  }

  async updateContact(
    contactId: string,
    params: UpdateContactParams
  ): Promise<EveniumContact> {
    let response = await this.http.put(`/contacts/${contactId}`, params);
    return response.data;
  }

  async deleteContact(contactId: string): Promise<void> {
    await this.http.delete(`/contacts/${contactId}`);
  }

  async getContactEvents(contactId: string): Promise<EveniumEvent[]> {
    let response = await this.http.get(`/contacts/${contactId}/events`);
    let data = response.data;
    let events: EveniumEvent[] = data.events ?? data.event ?? [];
    if (!Array.isArray(events)) {
      events = [events];
    }
    return events;
  }

  // Event Parts / Sessions

  async listEventParts(eventId: string): Promise<Record<string, unknown>[]> {
    let response = await this.http.get(`/events/${eventId}/eventParts`);
    let data = response.data;
    let parts = data.eventParts ?? data.eventPart ?? [];
    if (!Array.isArray(parts)) {
      parts = [parts];
    }
    return parts;
  }
}
