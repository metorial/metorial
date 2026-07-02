import { createAxios } from 'slates';

export class Client {
  private http;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://secure.splitwise.com/api/v3.0',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Users ──

  async getCurrentUser() {
    let response = await this.http.get('/get_current_user');
    return response.data.user;
  }

  async getUser(userId: number) {
    let response = await this.http.get(`/get_user/${userId}`);
    return response.data.user;
  }

  async updateUser(
    userId: number,
    params: {
      first_name?: string;
      last_name?: string;
      email?: string;
      password?: string;
      locale?: string;
      default_currency?: string;
    }
  ) {
    let response = await this.http.post(`/update_user/${userId}`, params);
    return response.data.user;
  }

  // ── Groups ──

  async getGroups() {
    let response = await this.http.get('/get_groups');
    return response.data.groups;
  }

  async getGroup(groupId: number) {
    let response = await this.http.get(`/get_group/${groupId}`);
    return response.data.group;
  }

  async createGroup(params: {
    name: string;
    group_type?: string;
    simplify_by_default?: boolean;
    users?: Array<{
      user_id?: number;
      email?: string;
      first_name?: string;
      last_name?: string;
    }>;
  }) {
    let body: Record<string, any> = {
      name: params.name
    };

    if (params.group_type) body.group_type = params.group_type;
    if (params.simplify_by_default !== undefined)
      body.simplify_by_default = params.simplify_by_default;

    if (params.users) {
      params.users.forEach((user, index) => {
        if (user.user_id) body[`users__${index}__user_id`] = user.user_id;
        if (user.email) body[`users__${index}__email`] = user.email;
        if (user.first_name) body[`users__${index}__first_name`] = user.first_name;
        if (user.last_name) body[`users__${index}__last_name`] = user.last_name;
      });
    }

    let response = await this.http.post('/create_group', body);
    return response.data.group;
  }

  async deleteGroup(groupId: number) {
    let response = await this.http.post(`/delete_group/${groupId}`);
    return response.data;
  }

  async restoreGroup(groupId: number) {
    let response = await this.http.post(`/undelete_group/${groupId}`);
    return response.data;
  }

  async addUserToGroup(groupId: number, userId: number) {
    let response = await this.http.post('/add_user_to_group', {
      group_id: groupId,
      user_id: userId
    });
    return response.data;
  }

  async removeUserFromGroup(groupId: number, userId: number) {
    let response = await this.http.post('/remove_user_from_group', {
      group_id: groupId,
      user_id: userId
    });
    return response.data;
  }

  // ── Expenses ──

  async getExpenses(params?: {
    group_id?: number;
    friend_id?: number;
    dated_after?: string;
    dated_before?: string;
    updated_after?: string;
    updated_before?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.http.get('/get_expenses', { params });
    return response.data.expenses;
  }

  async getExpense(expenseId: number) {
    let response = await this.http.get(`/get_expense/${expenseId}`);
    return response.data.expense;
  }

  async createExpenseEqualSplit(params: {
    cost: string;
    description: string;
    group_id: number;
    currency_code?: string;
    category_id?: number;
    date?: string;
    details?: string;
    repeat_interval?: string;
  }) {
    let body: Record<string, any> = {
      cost: params.cost,
      description: params.description,
      group_id: params.group_id,
      split_equally: true
    };

    if (params.currency_code) body.currency_code = params.currency_code;
    if (params.category_id) body.category_id = params.category_id;
    if (params.date) body.date = params.date;
    if (params.details) body.details = params.details;
    if (params.repeat_interval) body.repeat_interval = params.repeat_interval;

    let response = await this.http.post('/create_expense', body);

    if (response.data.errors && Object.keys(response.data.errors).length > 0) {
      throw new Error(`Failed to create expense: ${JSON.stringify(response.data.errors)}`);
    }

    return response.data.expenses;
  }

  async createExpenseByShares(params: {
    cost: string;
    description: string;
    group_id?: number;
    currency_code?: string;
    category_id?: number;
    date?: string;
    details?: string;
    repeat_interval?: string;
    users: Array<{
      user_id?: number;
      email?: string;
      first_name?: string;
      last_name?: string;
      paid_share: string;
      owed_share: string;
    }>;
  }) {
    let body: Record<string, any> = {
      cost: params.cost,
      description: params.description
    };

    if (params.group_id) body.group_id = params.group_id;
    if (params.currency_code) body.currency_code = params.currency_code;
    if (params.category_id) body.category_id = params.category_id;
    if (params.date) body.date = params.date;
    if (params.details) body.details = params.details;
    if (params.repeat_interval) body.repeat_interval = params.repeat_interval;

    params.users.forEach((user, index) => {
      if (user.user_id) body[`users__${index}__user_id`] = user.user_id;
      if (user.email) body[`users__${index}__email`] = user.email;
      if (user.first_name) body[`users__${index}__first_name`] = user.first_name;
      if (user.last_name) body[`users__${index}__last_name`] = user.last_name;
      body[`users__${index}__paid_share`] = user.paid_share;
      body[`users__${index}__owed_share`] = user.owed_share;
    });

    let response = await this.http.post('/create_expense', body);

    if (response.data.errors && Object.keys(response.data.errors).length > 0) {
      throw new Error(`Failed to create expense: ${JSON.stringify(response.data.errors)}`);
    }

    return response.data.expenses;
  }

  async updateExpense(
    expenseId: number,
    params: {
      cost?: string;
      description?: string;
      group_id?: number;
      currency_code?: string;
      category_id?: number;
      date?: string;
      details?: string;
      repeat_interval?: string;
      users?: Array<{
        user_id?: number;
        email?: string;
        first_name?: string;
        last_name?: string;
        paid_share: string;
        owed_share: string;
      }>;
    }
  ) {
    let body: Record<string, any> = {};

    if (params.cost !== undefined) body.cost = params.cost;
    if (params.description !== undefined) body.description = params.description;
    if (params.group_id !== undefined) body.group_id = params.group_id;
    if (params.currency_code !== undefined) body.currency_code = params.currency_code;
    if (params.category_id !== undefined) body.category_id = params.category_id;
    if (params.date !== undefined) body.date = params.date;
    if (params.details !== undefined) body.details = params.details;
    if (params.repeat_interval !== undefined) body.repeat_interval = params.repeat_interval;

    if (params.users) {
      params.users.forEach((user, index) => {
        if (user.user_id) body[`users__${index}__user_id`] = user.user_id;
        if (user.email) body[`users__${index}__email`] = user.email;
        if (user.first_name) body[`users__${index}__first_name`] = user.first_name;
        if (user.last_name) body[`users__${index}__last_name`] = user.last_name;
        body[`users__${index}__paid_share`] = user.paid_share;
        body[`users__${index}__owed_share`] = user.owed_share;
      });
    }

    let response = await this.http.post(`/update_expense/${expenseId}`, body);

    if (response.data.errors && Object.keys(response.data.errors).length > 0) {
      throw new Error(`Failed to update expense: ${JSON.stringify(response.data.errors)}`);
    }

    return response.data.expenses;
  }

  async deleteExpense(expenseId: number) {
    let response = await this.http.post(`/delete_expense/${expenseId}`);
    return response.data;
  }

  async restoreExpense(expenseId: number) {
    let response = await this.http.post(`/undelete_expense/${expenseId}`);
    return response.data;
  }

  // ── Friends ──

  async getFriends() {
    let response = await this.http.get('/get_friends');
    return response.data.friends;
  }

  async getFriend(friendId: number) {
    let response = await this.http.get(`/get_friend/${friendId}`);
    return response.data.friend;
  }

  async addFriend(email: string, firstName?: string, lastName?: string) {
    let response = await this.http.post('/create_friend', {
      user_email: email,
      user_first_name: firstName,
      user_last_name: lastName
    });
    return response.data;
  }

  async addFriends(users: Array<{ email: string; firstName?: string; lastName?: string }>) {
    let body: Record<string, any> = {};
    users.forEach((user, index) => {
      body[`friends__${index}__email`] = user.email;
      if (user.firstName) body[`friends__${index}__first_name`] = user.firstName;
      if (user.lastName) body[`friends__${index}__last_name`] = user.lastName;
    });
    let response = await this.http.post('/create_friends', body);
    return response.data;
  }

  async deleteFriend(friendId: number) {
    let response = await this.http.post(`/delete_friend/${friendId}`);
    return response.data;
  }

  // ── Comments ──

  async getComments(expenseId: number) {
    let response = await this.http.get('/get_comments', {
      params: { expense_id: expenseId }
    });
    return response.data.comments;
  }

  async createComment(expenseId: number, content: string) {
    let response = await this.http.post('/create_comment', {
      expense_id: expenseId,
      content
    });
    return response.data.comment;
  }

  async deleteComment(commentId: number) {
    let response = await this.http.post(`/delete_comment/${commentId}`);
    return response.data;
  }

  // ── Notifications ──

  async getNotifications(params?: { updatedAfter?: string; limit?: number }) {
    let queryParams: Record<string, any> = {};
    if (params?.updatedAfter) queryParams.updated_after = params.updatedAfter;
    if (params?.limit) queryParams.limit = params.limit;

    let response = await this.http.get('/get_notifications', { params: queryParams });
    return response.data.notifications;
  }

  // ── Reference Data ──

  async getCurrencies() {
    let response = await this.http.get('/get_currencies');
    return response.data.currencies;
  }

  async getCategories() {
    let response = await this.http.get('/get_categories');
    return response.data.categories;
  }
}
