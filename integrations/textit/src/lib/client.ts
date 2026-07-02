import { createAxios } from 'slates';

export interface PaginatedResponse<T> {
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ContactGroup {
  uuid: string;
  name: string;
}

export interface Contact {
  uuid: string;
  name: string | null;
  status: 'active' | 'blocked' | 'stopped' | 'archived';
  language: string | null;
  urns: string[];
  groups: ContactGroup[];
  fields: Record<string, string | null>;
  flow: { uuid: string; name: string } | null;
  created_on: string;
  modified_on: string;
  last_seen_on: string | null;
}

export interface Group {
  uuid: string;
  name: string;
  query: string | null;
  status: string;
  system: boolean;
  count: number;
}

export interface Field {
  key: string;
  name: string;
  type: string;
}

export interface Message {
  uuid: string;
  contact: { uuid: string; name: string | null };
  urn: string;
  channel: { uuid: string; name: string } | null;
  direction: 'incoming' | 'outgoing';
  type: string;
  status: string;
  visibility: string;
  text: string;
  attachments: string[];
  labels: { uuid: string; name: string }[];
  flow: { uuid: string; name: string } | null;
  created_on: string;
  sent_on: string | null;
  modified_on: string;
}

export interface Broadcast {
  uuid: string;
  urns: string[];
  contacts: { uuid: string; name: string }[];
  groups: { uuid: string; name: string }[];
  text: Record<string, string>;
  status: string;
  created_on: string;
}

export interface Flow {
  uuid: string;
  name: string;
  type: string;
  archived: boolean;
  labels: { uuid: string; name: string }[];
  expires: number;
  runs: { active: number; completed: number; interrupted: number; expired: number };
  results: Array<{ key: string; name: string; categories: string[]; node_uuids: string[] }>;
  parent_refs: string[];
  created_on: string;
  modified_on: string;
}

export interface FlowStart {
  uuid: string;
  flow: { uuid: string; name: string };
  contacts: { uuid: string; name: string }[];
  groups: { uuid: string; name: string }[];
  status: string;
  params: Record<string, any> | null;
  created_on: string;
  modified_on: string;
}

export interface Run {
  uuid: string;
  flow: { uuid: string; name: string };
  contact: { uuid: string; urn: string; name: string };
  start: { uuid: string } | null;
  responded: boolean;
  values: Record<
    string,
    {
      value: string;
      category: string;
      node: string;
      time: string;
      name: string;
      input: string;
    }
  >;
  created_on: string;
  modified_on: string;
  exited_on: string | null;
  exit_type: string | null;
}

export interface Campaign {
  uuid: string;
  name: string;
  archived: boolean;
  group: { uuid: string; name: string };
  created_on: string;
}

export interface CampaignEvent {
  uuid: string;
  campaign: { uuid: string; name: string };
  relative_to: { key: string; name: string };
  offset: number;
  unit: 'minutes' | 'hours' | 'days' | 'weeks';
  delivery_hour: number;
  message: Record<string, string> | null;
  flow: { uuid: string; name: string } | null;
  created_on: string;
}

export interface Channel {
  uuid: string;
  name: string;
  address: string;
  country: string;
  device: Record<string, any> | null;
  last_seen: string;
  created_on: string;
}

export interface Label {
  uuid: string;
  name: string;
  count: number;
}

export interface Ticket {
  uuid: string;
  contact: { uuid: string; name: string | null };
  status: 'open' | 'closed';
  topic: { uuid: string; name: string } | null;
  assignee: { email: string; name: string } | null;
  opened_on: string;
  modified_on: string;
  closed_on: string | null;
}

export interface Topic {
  uuid: string;
  name: string;
  counts: { open: number; closed: number };
  system: boolean;
  created_on: string;
}

export interface Workspace {
  uuid: string;
  name: string;
  country: string;
  languages: string[];
  timezone: string;
  date_style: string;
  anon: boolean;
}

export interface Global {
  key: string;
  name: string;
  value: string;
  modified_on: string;
}

export interface Resthook {
  resthook: string;
  created_on: string;
  modified_on: string;
}

export interface ResthookSubscriber {
  id: number;
  resthook: string;
  target_url: string;
  created_on: string;
}

export interface ResthookEvent {
  resthook: string;
  data: Record<string, any>;
  created_on: string;
}

export class Client {
  private axios;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://textit.com/api/v2',
      headers: {
        Authorization: `Token ${token}`
      }
    });
  }

  // Contacts
  async listContacts(params?: {
    uuid?: string;
    urn?: string;
    group?: string;
    before?: string;
    after?: string;
    cursor?: string;
  }): Promise<PaginatedResponse<Contact>> {
    let url = '/contacts.json';
    if (params?.cursor) {
      let response = await this.axios.get(params.cursor);
      return response.data;
    }
    let response = await this.axios.get(url, { params });
    return response.data;
  }

  async createContact(data: {
    name?: string;
    language?: string;
    urns?: string[];
    groups?: string[];
    fields?: Record<string, string>;
  }): Promise<Contact> {
    let response = await this.axios.post('/contacts.json', data);
    return response.data;
  }

  async updateContact(
    identifier: { uuid?: string; urn?: string },
    data: {
      name?: string;
      language?: string;
      urns?: string[];
      groups?: string[];
      fields?: Record<string, string>;
    }
  ): Promise<Contact> {
    let params: Record<string, string> = {};
    if (identifier.uuid) params.uuid = identifier.uuid;
    else if (identifier.urn) params.urn = identifier.urn;
    let response = await this.axios.post('/contacts.json', data, { params });
    return response.data;
  }

  async deleteContact(identifier: { uuid?: string; urn?: string }): Promise<void> {
    let params: Record<string, string> = {};
    if (identifier.uuid) params.uuid = identifier.uuid;
    else if (identifier.urn) params.urn = identifier.urn;
    await this.axios.delete('/contacts.json', { params });
  }

  // Contact Actions
  async performContactAction(data: {
    contacts: string[];
    action:
      | 'add'
      | 'remove'
      | 'block'
      | 'unblock'
      | 'archive'
      | 'restore'
      | 'interrupt'
      | 'delete';
    group?: string;
  }): Promise<void> {
    await this.axios.post('/contact_actions.json', data);
  }

  // Groups
  async listGroups(params?: {
    uuid?: string;
    name?: string;
  }): Promise<PaginatedResponse<Group>> {
    let response = await this.axios.get('/groups.json', { params });
    return response.data;
  }

  async createGroup(data: { name: string }): Promise<Group> {
    let response = await this.axios.post('/groups.json', data);
    return response.data;
  }

  async updateGroup(uuid: string, data: { name: string }): Promise<Group> {
    let response = await this.axios.post('/groups.json', data, { params: { uuid } });
    return response.data;
  }

  async deleteGroup(uuid: string): Promise<void> {
    await this.axios.delete('/groups.json', { params: { uuid } });
  }

  // Fields
  async listFields(params?: { key?: string }): Promise<PaginatedResponse<Field>> {
    let response = await this.axios.get('/fields.json', { params });
    return response.data;
  }

  async createField(data: { name: string; type: string }): Promise<Field> {
    let response = await this.axios.post('/fields.json', data);
    return response.data;
  }

  async updateField(key: string, data: { name: string; type: string }): Promise<Field> {
    let response = await this.axios.post('/fields.json', data, { params: { key } });
    return response.data;
  }

  // Messages
  async listMessages(params?: {
    uuid?: string;
    folder?: 'inbox' | 'flows' | 'archived' | 'outbox' | 'sent' | 'failed';
    before?: string;
    after?: string;
    contact?: string;
    label?: string;
    cursor?: string;
  }): Promise<PaginatedResponse<Message>> {
    if (params?.cursor) {
      let response = await this.axios.get(params.cursor);
      return response.data;
    }
    let response = await this.axios.get('/messages.json', { params });
    return response.data;
  }

  async sendMessage(data: {
    contact: string;
    text: string;
    attachments?: string[];
    quick_replies?: string[];
  }): Promise<Message> {
    let response = await this.axios.post('/messages.json', data);
    return response.data;
  }

  // Message Actions
  async performMessageAction(data: {
    messages: number[];
    action: 'label' | 'unlabel' | 'archive' | 'restore' | 'delete';
    label?: string;
  }): Promise<void> {
    await this.axios.post('/message_actions.json', data);
  }

  // Broadcasts
  async listBroadcasts(params?: {
    uuid?: string;
    before?: string;
    after?: string;
  }): Promise<PaginatedResponse<Broadcast>> {
    let response = await this.axios.get('/broadcasts.json', { params });
    return response.data;
  }

  async sendBroadcast(data: {
    text: Record<string, string>;
    urns?: string[];
    contacts?: string[];
    groups?: string[];
    base_language?: string;
  }): Promise<Broadcast> {
    let response = await this.axios.post('/broadcasts.json', data);
    return response.data;
  }

  // Flows
  async listFlows(params?: {
    uuid?: string;
    type?: string;
    archived?: boolean;
    before?: string;
    after?: string;
  }): Promise<PaginatedResponse<Flow>> {
    let response = await this.axios.get('/flows.json', { params });
    return response.data;
  }

  // Flow Starts
  async listFlowStarts(params?: { uuid?: string }): Promise<PaginatedResponse<FlowStart>> {
    let response = await this.axios.get('/flow_starts.json', { params });
    return response.data;
  }

  async startFlow(data: {
    flow: string;
    groups?: string[];
    contacts?: string[];
    urns?: string[];
    restart_participants?: boolean;
    exclude_active?: boolean;
    params?: Record<string, any>;
  }): Promise<FlowStart> {
    let response = await this.axios.post('/flow_starts.json', data);
    return response.data;
  }

  // Runs
  async listRuns(params?: {
    uuid?: string;
    flow?: string;
    contact?: string;
    responded?: boolean;
    before?: string;
    after?: string;
    cursor?: string;
  }): Promise<PaginatedResponse<Run>> {
    if (params?.cursor) {
      let response = await this.axios.get(params.cursor);
      return response.data;
    }
    let response = await this.axios.get('/runs.json', { params });
    return response.data;
  }

  // Campaigns
  async listCampaigns(params?: {
    uuid?: string;
    before?: string;
    after?: string;
  }): Promise<PaginatedResponse<Campaign>> {
    let response = await this.axios.get('/campaigns.json', { params });
    return response.data;
  }

  async createCampaign(data: { name: string; group: string }): Promise<Campaign> {
    let response = await this.axios.post('/campaigns.json', data);
    return response.data;
  }

  async updateCampaign(
    uuid: string,
    data: { name?: string; group?: string }
  ): Promise<Campaign> {
    let response = await this.axios.post('/campaigns.json', data, { params: { uuid } });
    return response.data;
  }

  // Campaign Events
  async listCampaignEvents(params?: {
    uuid?: string;
    campaign?: string;
  }): Promise<PaginatedResponse<CampaignEvent>> {
    let response = await this.axios.get('/campaign_events.json', { params });
    return response.data;
  }

  async createCampaignEvent(data: {
    campaign: string;
    relative_to: string;
    offset: number;
    unit: string;
    delivery_hour: number;
    message?: Record<string, string>;
    flow?: string;
  }): Promise<CampaignEvent> {
    let response = await this.axios.post('/campaign_events.json', data);
    return response.data;
  }

  async updateCampaignEvent(
    uuid: string,
    data: {
      relative_to?: string;
      offset?: number;
      unit?: string;
      delivery_hour?: number;
      message?: Record<string, string>;
      flow?: string;
    }
  ): Promise<CampaignEvent> {
    let response = await this.axios.post('/campaign_events.json', data, { params: { uuid } });
    return response.data;
  }

  async deleteCampaignEvent(uuid: string): Promise<void> {
    await this.axios.delete('/campaign_events.json', { params: { uuid } });
  }

  // Channels
  async listChannels(params?: {
    uuid?: string;
    address?: string;
  }): Promise<PaginatedResponse<Channel>> {
    let response = await this.axios.get('/channels.json', { params });
    return response.data;
  }

  // Labels
  async listLabels(params?: {
    uuid?: string;
    name?: string;
  }): Promise<PaginatedResponse<Label>> {
    let response = await this.axios.get('/labels.json', { params });
    return response.data;
  }

  async createLabel(data: { name: string }): Promise<Label> {
    let response = await this.axios.post('/labels.json', data);
    return response.data;
  }

  async updateLabel(uuid: string, data: { name: string }): Promise<Label> {
    let response = await this.axios.post('/labels.json', data, { params: { uuid } });
    return response.data;
  }

  async deleteLabel(uuid: string): Promise<void> {
    await this.axios.delete('/labels.json', { params: { uuid } });
  }

  // Tickets
  async listTickets(params?: {
    uuid?: string;
    contact?: string;
  }): Promise<PaginatedResponse<Ticket>> {
    let response = await this.axios.get('/tickets.json', { params });
    return response.data;
  }

  // Ticket Actions
  async performTicketAction(data: {
    tickets: string[];
    action: 'assign' | 'note' | 'close' | 'reopen';
    assignee?: string;
    note?: string;
  }): Promise<void> {
    await this.axios.post('/ticket_actions.json', data);
  }

  // Topics
  async listTopics(): Promise<PaginatedResponse<Topic>> {
    let response = await this.axios.get('/topics.json');
    return response.data;
  }

  async createTopic(data: { name: string }): Promise<Topic> {
    let response = await this.axios.post('/topics.json', data);
    return response.data;
  }

  // Workspace
  async getWorkspace(): Promise<Workspace> {
    let response = await this.axios.get('/workspace.json');
    return response.data;
  }

  // Globals
  async listGlobals(): Promise<PaginatedResponse<Global>> {
    let response = await this.axios.get('/globals.json');
    return response.data;
  }

  async createGlobal(data: { name: string; value: string }): Promise<Global> {
    let response = await this.axios.post('/globals.json', data);
    return response.data;
  }

  async updateGlobal(key: string, data: { name?: string; value?: string }): Promise<Global> {
    let response = await this.axios.post('/globals.json', data, { params: { key } });
    return response.data;
  }

  // Resthooks
  async listResthooks(): Promise<PaginatedResponse<Resthook>> {
    let response = await this.axios.get('/resthooks.json');
    return response.data;
  }

  // Resthook Subscribers
  async listResthookSubscribers(params?: {
    resthook?: string;
  }): Promise<PaginatedResponse<ResthookSubscriber>> {
    let response = await this.axios.get('/resthook_subscribers.json', { params });
    return response.data;
  }

  async createResthookSubscriber(data: {
    resthook: string;
    target_url: string;
  }): Promise<ResthookSubscriber> {
    let response = await this.axios.post('/resthook_subscribers.json', data);
    return response.data;
  }

  async deleteResthookSubscriber(id: number): Promise<void> {
    await this.axios.delete('/resthook_subscribers.json', { params: { id } });
  }

  // Resthook Events
  async listResthookEvents(params?: {
    resthook?: string;
  }): Promise<PaginatedResponse<ResthookEvent>> {
    let response = await this.axios.get('/resthook_events.json', { params });
    return response.data;
  }
}
