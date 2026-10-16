import { createApiServiceError, createAuthenticatedAxios } from 'slates';
import {
  checkInteger,
  checkResponse,
  requireSuccess,
  responseArray,
  responseObject,
  toSplitwiseError
} from './errors';

export class Client {
  private http;

  constructor(config: { token: string }) {
    if (typeof config.token !== 'string' || !config.token.trim()) {
      throw createApiServiceError('A Splitwise access token is required.');
    }
    this.http = createAuthenticatedAxios({
      timeout: 30000,
      errorAdapter: toSplitwiseError,
      baseURL: 'https://secure.splitwise.com/api/v3.0',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
    this.http.interceptors.response.use(response => {
      checkResponse(response.data, response.status);
      return response;
    });
  }

  // ── Users ──

  async getCurrentUser() {
    let response = await this.http.get('/get_current_user');
    return responseObject(response.data.user, 'user');
  }

  async getUser(userId: number) {
    checkInteger(userId, 'userId');
    let response = await this.http.get(`/get_user/${userId}`);
    return responseObject(response.data.user, 'user');
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
    checkInteger(userId, 'userId');
    let response = await this.http.post(`/update_user/${userId}`, params);
    return responseObject(response.data.user ?? response.data, 'user');
  }

  // ── Groups ──

  async getGroups() {
    let response = await this.http.get('/get_groups');
    return responseArray(response.data.groups, 'groups');
  }

  async getGroup(groupId: number) {
    checkInteger(groupId, 'groupId');
    let response = await this.http.get(`/get_group/${groupId}`);
    return responseObject(response.data.group, 'group');
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
        checkInteger(user.user_id, 'userId');
        if (user.user_id !== undefined) body[`users__${index}__user_id`] = user.user_id;
        if (user.email) body[`users__${index}__email`] = user.email;
        if (user.first_name) body[`users__${index}__first_name`] = user.first_name;
        if (user.last_name) body[`users__${index}__last_name`] = user.last_name;
      });
    }

    let response = await this.http.post('/create_group', body);
    return responseObject(response.data.group, 'group');
  }

  async deleteGroup(groupId: number) {
    checkInteger(groupId, 'groupId');
    let response = await this.http.post(`/delete_group/${groupId}`);
    return requireSuccess(response.data);
  }

  async restoreGroup(groupId: number) {
    checkInteger(groupId, 'groupId');
    let response = await this.http.post(`/undelete_group/${groupId}`);
    return requireSuccess(response.data);
  }

  async addUserToGroup(groupId: number, userId: number) {
    checkInteger(groupId, 'groupId');
    checkInteger(userId, 'userId');
    let response = await this.http.post('/add_user_to_group', {
      group_id: groupId,
      user_id: userId
    });
    return requireSuccess(response.data);
  }

  async removeUserFromGroup(groupId: number, userId: number) {
    checkInteger(groupId, 'groupId');
    checkInteger(userId, 'userId');
    let response = await this.http.post('/remove_user_from_group', {
      group_id: groupId,
      user_id: userId
    });
    return requireSuccess(response.data);
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
    for (let [name, value] of Object.entries(params ?? {})) {
      if (typeof value === 'number') checkInteger(value, name);
    }
    let response = await this.http.get('/get_expenses', { params });
    return responseArray(response.data.expenses, 'expenses');
  }

  async getExpense(expenseId: number) {
    checkInteger(expenseId, 'expenseId');
    let response = await this.http.get(`/get_expense/${expenseId}`);
    return responseObject(response.data.expense, 'expense');
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
    checkInteger(params.group_id, 'groupId');
    checkInteger(params.category_id, 'categoryId');
    let body: Record<string, any> = {
      cost: params.cost,
      description: params.description,
      group_id: params.group_id,
      split_equally: true
    };

    if (params.currency_code) body.currency_code = params.currency_code;
    if (params.category_id !== undefined) body.category_id = params.category_id;
    if (params.date) body.date = params.date;
    if (params.details) body.details = params.details;
    if (params.repeat_interval) body.repeat_interval = params.repeat_interval;

    let response = await this.http.post('/create_expense', body);
    if (!response.data.errors || typeof response.data.errors !== 'object') {
      throw createApiServiceError('Splitwise did not confirm the expense operation.');
    }

    return responseArray(response.data.expenses, 'expenses');
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
    checkInteger(params.group_id, 'groupId');
    checkInteger(params.category_id, 'categoryId');
    let body: Record<string, any> = {
      cost: params.cost,
      description: params.description
    };

    if (params.group_id !== undefined) body.group_id = params.group_id;
    if (params.currency_code) body.currency_code = params.currency_code;
    if (params.category_id !== undefined) body.category_id = params.category_id;
    if (params.date) body.date = params.date;
    if (params.details) body.details = params.details;
    if (params.repeat_interval) body.repeat_interval = params.repeat_interval;

    params.users.forEach((user, index) => {
      checkInteger(user.user_id, 'userId');
      if (user.user_id !== undefined) body[`users__${index}__user_id`] = user.user_id;
      if (user.email) body[`users__${index}__email`] = user.email;
      if (user.first_name) body[`users__${index}__first_name`] = user.first_name;
      if (user.last_name) body[`users__${index}__last_name`] = user.last_name;
      body[`users__${index}__paid_share`] = user.paid_share;
      body[`users__${index}__owed_share`] = user.owed_share;
    });

    let response = await this.http.post('/create_expense', body);
    if (!response.data.errors || typeof response.data.errors !== 'object') {
      throw createApiServiceError('Splitwise did not confirm the expense operation.');
    }

    return responseArray(response.data.expenses, 'expenses');
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
    checkInteger(expenseId, 'expenseId');
    checkInteger(params.group_id, 'groupId');
    checkInteger(params.category_id, 'categoryId');
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
        checkInteger(user.user_id, 'userId');
        if (user.user_id !== undefined) body[`users__${index}__user_id`] = user.user_id;
        if (user.email) body[`users__${index}__email`] = user.email;
        if (user.first_name) body[`users__${index}__first_name`] = user.first_name;
        if (user.last_name) body[`users__${index}__last_name`] = user.last_name;
        body[`users__${index}__paid_share`] = user.paid_share;
        body[`users__${index}__owed_share`] = user.owed_share;
      });
    }

    let response = await this.http.post(`/update_expense/${expenseId}`, body);
    if (!response.data.errors || typeof response.data.errors !== 'object') {
      throw createApiServiceError('Splitwise did not confirm the expense operation.');
    }

    return responseArray(response.data.expenses, 'expenses');
  }

  async deleteExpense(expenseId: number) {
    checkInteger(expenseId, 'expenseId');
    let response = await this.http.post(`/delete_expense/${expenseId}`);
    return requireSuccess(response.data);
  }

  async restoreExpense(expenseId: number) {
    checkInteger(expenseId, 'expenseId');
    let response = await this.http.post(`/undelete_expense/${expenseId}`);
    return requireSuccess(response.data);
  }

  // ── Friends ──

  async getFriends() {
    let response = await this.http.get('/get_friends');
    return responseArray(response.data.friends, 'friends');
  }

  async getFriend(friendId: number) {
    checkInteger(friendId, 'friendId');
    let response = await this.http.get(`/get_friend/${friendId}`);
    return responseObject(response.data.friend, 'friend');
  }

  async addFriend(email: string, firstName?: string, lastName?: string) {
    let response = await this.http.post('/create_friend', {
      user_email: email,
      user_first_name: firstName,
      user_last_name: lastName
    });
    let friend = responseObject(response.data.friend ?? response.data.friends?.[0], 'friend');
    if (typeof friend.id !== 'number')
      throw createApiServiceError('Splitwise did not return the added friend ID.');
    return { ...response.data, friends: [friend] };
  }

  async addFriends(users: Array<{ email: string; firstName?: string; lastName?: string }>) {
    let body: Record<string, any> = {};
    users.forEach((user, index) => {
      body[`users__${index}__email`] = user.email;
      if (user.firstName) body[`users__${index}__first_name`] = user.firstName;
      if (user.lastName) body[`users__${index}__last_name`] = user.lastName;
    });
    let response = await this.http.post('/create_friends', body);
    let friends = responseArray(response.data.users ?? response.data.friends, 'friends');
    if (friends.length === 0 || friends.some(friend => typeof friend.id !== 'number')) {
      throw createApiServiceError('Splitwise did not return the added friend IDs.');
    }
    return { ...response.data, friends };
  }

  async deleteFriend(friendId: number) {
    checkInteger(friendId, 'friendId');
    let response = await this.http.post(`/delete_friend/${friendId}`);
    return requireSuccess(response.data);
  }

  // ── Comments ──

  async getComments(expenseId: number) {
    checkInteger(expenseId, 'expenseId');
    let response = await this.http.get('/get_comments', {
      params: { expense_id: expenseId }
    });
    return responseArray(response.data.comments, 'comments');
  }

  async createComment(expenseId: number, content: string) {
    checkInteger(expenseId, 'expenseId');
    let response = await this.http.post('/create_comment', {
      expense_id: expenseId,
      content
    });
    return responseObject(response.data.comment, 'comment');
  }

  async deleteComment(commentId: number) {
    checkInteger(commentId, 'commentId');
    let response = await this.http.post(`/delete_comment/${commentId}`);
    let comment = responseObject(response.data.comment, 'deleted comment');
    if (
      comment.id !== commentId ||
      typeof comment.deleted_at !== 'string' ||
      !comment.deleted_at
    ) {
      throw createApiServiceError('Splitwise did not confirm that the comment was deleted.');
    }
    return response.data;
  }

  // ── Notifications ──

  async getNotifications(params?: { updatedAfter?: string; limit?: number }) {
    checkInteger(params?.limit, 'limit');
    let queryParams: Record<string, any> = {};
    if (params?.updatedAfter) queryParams.updated_after = params.updatedAfter;
    if (params?.limit !== undefined) queryParams.limit = params.limit;

    let response = await this.http.get('/get_notifications', { params: queryParams });
    return responseArray(response.data.notifications, 'notifications');
  }

  // ── Reference Data ──

  async getCurrencies() {
    let response = await this.http.get('/get_currencies');
    return responseArray(response.data.currencies, 'currencies');
  }

  async getCategories() {
    let response = await this.http.get('/get_categories');
    return responseArray(response.data.categories, 'categories');
  }
}
