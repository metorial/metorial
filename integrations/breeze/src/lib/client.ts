import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(params: {
    token: string;
    subdomain: string;
    teamId?: string;
  }) {
    this.axios = createAxios({
      baseURL: `https://${params.subdomain}.breezechms.com/api`,
      headers: {
        'Api-Key': params.token,
        ...(params.teamId ? { HTTP_X_TEAM_ID: params.teamId } : {})
      }
    });
  }

  // ---- People ----

  async listPeople(options?: {
    limit?: number;
    offset?: number;
    details?: boolean;
    filterJson?: string;
  }) {
    let params: Record<string, string> = {};
    if (options?.limit !== undefined) params.limit = String(options.limit);
    if (options?.offset !== undefined) params.offset = String(options.offset);
    if (options?.details) params.details = '1';
    if (options?.filterJson) params.filter_json = options.filterJson;

    let response = await this.axios.get('/people', { params });
    return response.data;
  }

  async getPerson(personId: string, details?: boolean) {
    let params: Record<string, string> = {};
    if (details) params.details = '1';

    let response = await this.axios.get(`/people/${personId}`, { params });
    return response.data;
  }

  async addPerson(first: string, last: string, fieldsJson?: string) {
    let params: Record<string, string> = { first, last };
    if (fieldsJson) params.fields_json = fieldsJson;

    let response = await this.axios.get('/people/add', { params });
    return response.data;
  }

  async updatePerson(personId: string, fieldsJson: string) {
    let response = await this.axios.get('/people/update', {
      params: {
        person_id: personId,
        fields_json: fieldsJson
      }
    });
    return response.data;
  }

  async deletePerson(personId: string) {
    let response = await this.axios.get('/people/delete', {
      params: { person_id: personId }
    });
    return response.data;
  }

  async listProfileFields() {
    let response = await this.axios.get('/profile');
    return response.data;
  }

  // ---- Families ----

  async createFamily(peopleIds: string[]) {
    let response = await this.axios.get('/families/create', {
      params: { people_ids_json: JSON.stringify(peopleIds) }
    });
    return response.data;
  }

  async destroyFamily(peopleIds: string[]) {
    let response = await this.axios.get('/families/destroy', {
      params: { people_ids_json: JSON.stringify(peopleIds) }
    });
    return response.data;
  }

  async addToFamily(peopleIds: string[], targetPersonId: string) {
    let response = await this.axios.get('/families/add', {
      params: {
        people_ids_json: JSON.stringify(peopleIds),
        target_person_id: targetPersonId
      }
    });
    return response.data;
  }

  async removeFromFamily(peopleIds: string[]) {
    let response = await this.axios.get('/families/remove', {
      params: { people_ids_json: JSON.stringify(peopleIds) }
    });
    return response.data;
  }

  // ---- Tags ----

  async listTags(folderId?: string) {
    let params: Record<string, string> = {};
    if (folderId) params.folder_id = folderId;

    let response = await this.axios.get('/tags/list_tags', { params });
    return response.data;
  }

  async listTagFolders() {
    let response = await this.axios.get('/tags/list_folders');
    return response.data;
  }

  async addTag(name: string, folderId?: string) {
    let params: Record<string, string> = { name };
    if (folderId) params.folder_id = folderId;

    let response = await this.axios.get('/tags/add_tag', { params });
    return response.data;
  }

  async deleteTag(tagId: string) {
    let response = await this.axios.get('/tags/delete_tag', {
      params: { tag_id: tagId }
    });
    return response.data;
  }

  async addTagFolder(name: string, parentId?: string) {
    let params: Record<string, string> = { name };
    if (parentId) params.parent_id = parentId;

    let response = await this.axios.get('/tags/add_tag_folder', { params });
    return response.data;
  }

  async deleteTagFolder(folderId: string) {
    let response = await this.axios.get('/tags/delete_tag_folder', {
      params: { folder_id: folderId }
    });
    return response.data;
  }

  async assignTag(personId: string, tagId: string) {
    let response = await this.axios.get('/tags/assign', {
      params: { person_id: personId, tag_id: tagId }
    });
    return response.data;
  }

  async unassignTag(personId: string, tagId: string) {
    let response = await this.axios.get('/tags/unassign', {
      params: { person_id: personId, tag_id: tagId }
    });
    return response.data;
  }

  // ---- Events ----

  async listEvents(options?: {
    start?: string;
    end?: string;
    categoryId?: string;
    eligible?: boolean;
    details?: boolean;
    limit?: number;
  }) {
    let params: Record<string, string> = {};
    if (options?.start) params.start = options.start;
    if (options?.end) params.end = options.end;
    if (options?.categoryId) params.category_id = options.categoryId;
    if (options?.eligible) params.eligible = '1';
    if (options?.details) params.details = '1';
    if (options?.limit !== undefined) params.limit = String(options.limit);

    let response = await this.axios.get('/events', { params });
    return response.data;
  }

  async getEvent(
    instanceId: string,
    options?: {
      schedule?: boolean;
      scheduleDirection?: string;
      scheduleLimit?: number;
      eligible?: boolean;
      details?: boolean;
    }
  ) {
    let params: Record<string, string> = { instance_id: instanceId };
    if (options?.schedule) params.schedule = '1';
    if (options?.scheduleDirection) params.schedule_direction = options.scheduleDirection;
    if (options?.scheduleLimit !== undefined)
      params.schedule_limit = String(options.scheduleLimit);
    if (options?.eligible) params.eligible = '1';
    if (options?.details) params.details = '1';

    let response = await this.axios.get('/events/list_event', { params });
    return response.data;
  }

  async addEvent(options: {
    name: string;
    startsOn: string;
    endsOn?: string;
    allDay?: boolean;
    description?: string;
    categoryId?: string;
    eventId?: string;
  }) {
    let params: Record<string, string> = {
      name: options.name,
      starts_on: options.startsOn
    };
    if (options.endsOn) params.ends_on = options.endsOn;
    if (options.allDay) params.all_day = '1';
    if (options.description) params.description = options.description;
    if (options.categoryId) params.category_id = options.categoryId;
    if (options.eventId) params.event_id = options.eventId;

    let response = await this.axios.get('/events/add', { params });
    return response.data;
  }

  async deleteEvent(instanceId: string) {
    let response = await this.axios.get('/events/delete', {
      params: { instance_id: instanceId }
    });
    return response.data;
  }

  async listCalendars() {
    let response = await this.axios.get('/events/calendars/list');
    return response.data;
  }

  async listLocations() {
    let response = await this.axios.get('/events/locations');
    return response.data;
  }

  // ---- Attendance / Check-In ----

  async addAttendance(personId: string, instanceId: string, direction?: string) {
    let params: Record<string, string> = {
      person_id: personId,
      instance_id: instanceId
    };
    if (direction) params.direction = direction;

    let response = await this.axios.get('/events/attendance/add', { params });
    return response.data;
  }

  async removeAttendance(personId: string, instanceId: string) {
    let response = await this.axios.get('/events/attendance/delete', {
      params: { person_id: personId, instance_id: instanceId }
    });
    return response.data;
  }

  async listAttendance(
    instanceId: string,
    options?: {
      details?: boolean;
      type?: string;
    }
  ) {
    let params: Record<string, string> = { instance_id: instanceId };
    if (options?.details) params.details = '1';
    if (options?.type) params.type = options.type;

    let response = await this.axios.get('/events/attendance/list', { params });
    return response.data;
  }

  async listEligiblePeople(instanceId: string) {
    let response = await this.axios.get('/events/attendance/eligible', {
      params: { instance_id: instanceId }
    });
    return response.data;
  }

  // ---- Contributions / Giving ----

  async addContribution(options: {
    date: string;
    personJson?: string;
    uid?: string;
    processor?: string;
    method?: string;
    fundsJson?: string;
    amount?: string;
    group?: string;
    batchName?: string;
  }) {
    let params: Record<string, string> = { date: options.date };
    if (options.personJson) params.person_json = options.personJson;
    if (options.uid) params.uid = options.uid;
    if (options.processor) params.processor = options.processor;
    if (options.method) params.method = options.method;
    if (options.fundsJson) params.funds_json = options.fundsJson;
    if (options.amount) params.amount = options.amount;
    if (options.group) params.group = options.group;
    if (options.batchName) params.batch_name = options.batchName;

    let response = await this.axios.get('/giving/add', { params });
    return response.data;
  }

  // ---- Forms ----

  async listForms(isArchived?: boolean) {
    let params: Record<string, string> = {};
    if (isArchived !== undefined) params.is_archived = isArchived ? '1' : '0';

    let response = await this.axios.get('/forms/list_forms', { params });
    return response.data;
  }

  async listFormFields(formId: string) {
    let response = await this.axios.get('/forms/list_form_fields', {
      params: { form_id: formId }
    });
    return response.data;
  }

  async listFormEntries(formId: string, details?: boolean) {
    let params: Record<string, string> = { form_id: formId };
    if (details) params.details = '1';

    let response = await this.axios.get('/forms/list_form_entries', { params });
    return response.data;
  }

  async removeFormEntry(entryId: string) {
    let response = await this.axios.get('/forms/remove_form_entry', {
      params: { entry_id: entryId }
    });
    return response.data;
  }

  // ---- Volunteers ----

  async listVolunteers(instanceId: string) {
    let response = await this.axios.get('/volunteers/list', {
      params: { instance_id: instanceId }
    });
    return response.data;
  }

  async addVolunteer(instanceId: string, personId: string) {
    let response = await this.axios.get('/volunteers/add', {
      params: { instance_id: instanceId, person_id: personId }
    });
    return response.data;
  }

  async removeVolunteer(instanceId: string, personId: string) {
    let response = await this.axios.get('/volunteers/remove', {
      params: { instance_id: instanceId, person_id: personId }
    });
    return response.data;
  }

  async updateVolunteer(instanceId: string, personId: string, roleIds: string[]) {
    let response = await this.axios.get('/volunteers/update', {
      params: {
        instance_id: instanceId,
        person_id: personId,
        role_ids_json: JSON.stringify(roleIds)
      }
    });
    return response.data;
  }

  async listVolunteerRoles(instanceId: string, showQuantity?: boolean) {
    let params: Record<string, string> = { instance_id: instanceId };
    if (showQuantity) params.show_quantity = '1';

    let response = await this.axios.get('/volunteers/list_roles', { params });
    return response.data;
  }

  async addVolunteerRole(instanceId: string, name: string, quantity?: number) {
    let params: Record<string, string> = { instance_id: instanceId, name };
    if (quantity !== undefined) params.quantity = String(quantity);

    let response = await this.axios.get('/volunteers/add_role', { params });
    return response.data;
  }

  async removeVolunteerRole(instanceId: string, roleId: string) {
    let response = await this.axios.get('/volunteers/remove_role', {
      params: { instance_id: instanceId, role_id: roleId }
    });
    return response.data;
  }

  // ---- Account ----

  async getAccountSummary() {
    let response = await this.axios.get('/account/summary');
    return response.data;
  }

  async listAccountLog(options: {
    action: string;
    start?: string;
    end?: string;
    userId?: string;
    details?: boolean;
    limit?: number;
  }) {
    let params: Record<string, string> = { action: options.action };
    if (options.start) params.start = options.start;
    if (options.end) params.end = options.end;
    if (options.userId) params.user_id = options.userId;
    if (options.details) params.details = '1';
    if (options.limit !== undefined) params.limit = String(options.limit);

    let response = await this.axios.get('/account/list_log', { params });
    return response.data;
  }
}
