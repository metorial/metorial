import { createAxios } from 'slates';
import type {
  AhaComment,
  AhaEpic,
  AhaFeature,
  AhaGoal,
  AhaIdea,
  AhaInitiative,
  AhaPagination,
  AhaProduct,
  AhaRelease,
  AhaTodo,
  AhaUser
} from './types';

export class AhaClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(subdomain: string, token: string) {
    this.axios = createAxios({
      baseURL: `https://${subdomain}.aha.io/api/v1`,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  // ─── Products ──────────────────────────────────────────────────

  async listProducts(params?: {
    page?: number;
    perPage?: number;
  }): Promise<{ products: AhaProduct[]; pagination: AhaPagination }> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.axios.get('/products', { params: query });
    let data = response.data as { products: AhaProduct[]; pagination: AhaPagination };
    return data;
  }

  async getProduct(productId: string): Promise<AhaProduct> {
    let response = await this.axios.get(`/products/${productId}`);
    let data = response.data as { product: AhaProduct };
    return data.product;
  }

  async createProduct(product: {
    name: string;
    prefix: string;
    description?: string;
    parentId?: string;
  }): Promise<AhaProduct> {
    let body: Record<string, any> = {
      product: {
        name: product.name,
        reference_prefix: product.prefix
      }
    };
    if (product.description) body.product.description = product.description;
    if (product.parentId) body.product.parent_id = product.parentId;

    let response = await this.axios.post('/products', body);
    let data = response.data as { product: AhaProduct };
    return data.product;
  }

  async updateProduct(
    productId: string,
    updates: { name?: string; description?: string }
  ): Promise<AhaProduct> {
    let body: Record<string, any> = { product: {} };
    if (updates.name !== undefined) body.product.name = updates.name;
    if (updates.description !== undefined) body.product.description = updates.description;

    let response = await this.axios.put(`/products/${productId}`, body);
    let data = response.data as { product: AhaProduct };
    return data.product;
  }

  // ─── Releases ──────────────────────────────────────────────────

  async listReleases(
    productId: string,
    params?: { page?: number; perPage?: number }
  ): Promise<{ releases: AhaRelease[]; pagination: AhaPagination }> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.axios.get(`/products/${productId}/releases`, { params: query });
    let data = response.data as { releases: AhaRelease[]; pagination: AhaPagination };
    return data;
  }

  async getRelease(releaseId: string): Promise<AhaRelease> {
    let response = await this.axios.get(`/releases/${releaseId}`);
    let data = response.data as { release: AhaRelease };
    return data.release;
  }

  async createRelease(
    productId: string,
    release: {
      name: string;
      startDate?: string;
      releaseDate?: string;
      description?: string;
      parkingLot?: boolean;
    }
  ): Promise<AhaRelease> {
    let body: Record<string, any> = {
      release: {
        name: release.name
      }
    };
    if (release.startDate) body.release.start_date = release.startDate;
    if (release.releaseDate) body.release.release_date = release.releaseDate;
    if (release.description) body.release.description = release.description;
    if (release.parkingLot !== undefined) body.release.parking_lot = release.parkingLot;

    let response = await this.axios.post(`/products/${productId}/releases`, body);
    let data = response.data as { release: AhaRelease };
    return data.release;
  }

  async updateRelease(
    releaseId: string,
    updates: {
      name?: string;
      startDate?: string;
      releaseDate?: string;
      description?: string;
      parkingLot?: boolean;
    }
  ): Promise<AhaRelease> {
    let body: Record<string, any> = { release: {} };
    if (updates.name !== undefined) body.release.name = updates.name;
    if (updates.startDate !== undefined) body.release.start_date = updates.startDate;
    if (updates.releaseDate !== undefined) body.release.release_date = updates.releaseDate;
    if (updates.description !== undefined) body.release.description = updates.description;
    if (updates.parkingLot !== undefined) body.release.parking_lot = updates.parkingLot;

    let response = await this.axios.put(`/releases/${releaseId}`, body);
    let data = response.data as { release: AhaRelease };
    return data.release;
  }

  async deleteRelease(releaseId: string): Promise<void> {
    await this.axios.delete(`/releases/${releaseId}`);
  }

  // ─── Features ──────────────────────────────────────────────────

  async listFeatures(params?: {
    productId?: string;
    releaseId?: string;
    epicId?: string;
    page?: number;
    perPage?: number;
    updatedSince?: string;
    tag?: string;
    assignedToUser?: string;
  }): Promise<{ features: AhaFeature[]; pagination: AhaPagination }> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;
    if (params?.updatedSince) query.updated_since = params.updatedSince;
    if (params?.tag) query.tag = params.tag;
    if (params?.assignedToUser) query.assigned_to_user = params.assignedToUser;

    let path = '/features';
    if (params?.productId) path = `/products/${params.productId}/features`;
    else if (params?.releaseId) path = `/releases/${params.releaseId}/features`;
    else if (params?.epicId) path = `/epics/${params.epicId}/features`;

    let response = await this.axios.get(path, { params: query });
    let data = response.data as { features: AhaFeature[]; pagination: AhaPagination };
    return data;
  }

  async getFeature(featureId: string): Promise<AhaFeature> {
    let response = await this.axios.get(`/features/${featureId}`);
    let data = response.data as { feature: AhaFeature };
    return data.feature;
  }

  async createFeature(
    releaseId: string,
    feature: {
      name: string;
      description?: string;
      assignedToUser?: string;
      tags?: string[];
      startDate?: string;
      dueDate?: string;
      workflowStatus?: string;
    }
  ): Promise<AhaFeature> {
    let body: Record<string, any> = {
      feature: {
        name: feature.name
      }
    };
    if (feature.description) body.feature.description = feature.description;
    if (feature.assignedToUser) body.feature.assigned_to_user = feature.assignedToUser;
    if (feature.tags) body.feature.tags = feature.tags.join(',');
    if (feature.startDate) body.feature.start_date = feature.startDate;
    if (feature.dueDate) body.feature.due_date = feature.dueDate;
    if (feature.workflowStatus) body.feature.workflow_status = feature.workflowStatus;

    let response = await this.axios.post(`/releases/${releaseId}/features`, body);
    let data = response.data as { feature: AhaFeature };
    return data.feature;
  }

  async updateFeature(
    featureId: string,
    updates: {
      name?: string;
      description?: string;
      assignedToUser?: string;
      tags?: string[];
      startDate?: string;
      dueDate?: string;
      workflowStatus?: string;
    }
  ): Promise<AhaFeature> {
    let body: Record<string, any> = { feature: {} };
    if (updates.name !== undefined) body.feature.name = updates.name;
    if (updates.description !== undefined) body.feature.description = updates.description;
    if (updates.assignedToUser !== undefined)
      body.feature.assigned_to_user = updates.assignedToUser;
    if (updates.tags !== undefined) body.feature.tags = updates.tags.join(',');
    if (updates.startDate !== undefined) body.feature.start_date = updates.startDate;
    if (updates.dueDate !== undefined) body.feature.due_date = updates.dueDate;
    if (updates.workflowStatus !== undefined)
      body.feature.workflow_status = updates.workflowStatus;

    let response = await this.axios.put(`/features/${featureId}`, body);
    let data = response.data as { feature: AhaFeature };
    return data.feature;
  }

  async deleteFeature(featureId: string): Promise<void> {
    await this.axios.delete(`/features/${featureId}`);
  }

  // ─── Epics ─────────────────────────────────────────────────────

  async listEpics(params?: {
    productId?: string;
    releaseId?: string;
    page?: number;
    perPage?: number;
    updatedSince?: string;
  }): Promise<{ epics: AhaEpic[]; pagination: AhaPagination }> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;
    if (params?.updatedSince) query.updated_since = params.updatedSince;

    let path = '/epics';
    if (params?.productId) path = `/products/${params.productId}/epics`;
    else if (params?.releaseId) path = `/releases/${params.releaseId}/epics`;

    let response = await this.axios.get(path, { params: query });
    let data = response.data as { epics: AhaEpic[]; pagination: AhaPagination };
    return data;
  }

  async getEpic(epicId: string): Promise<AhaEpic> {
    let response = await this.axios.get(`/epics/${epicId}`);
    let data = response.data as { epic: AhaEpic };
    return data.epic;
  }

  async createEpic(
    productId: string,
    epic: {
      name: string;
      description?: string;
      assignedToUser?: string;
      tags?: string[];
      workflowStatus?: string;
    }
  ): Promise<AhaEpic> {
    let body: Record<string, any> = {
      epic: {
        name: epic.name
      }
    };
    if (epic.description) body.epic.description = epic.description;
    if (epic.assignedToUser) body.epic.assigned_to_user = epic.assignedToUser;
    if (epic.tags) body.epic.tags = epic.tags.join(',');
    if (epic.workflowStatus) body.epic.workflow_status = epic.workflowStatus;

    let response = await this.axios.post(`/products/${productId}/epics`, body);
    let data = response.data as { epic: AhaEpic };
    return data.epic;
  }

  async updateEpic(
    epicId: string,
    updates: {
      name?: string;
      description?: string;
      assignedToUser?: string;
      tags?: string[];
      workflowStatus?: string;
    }
  ): Promise<AhaEpic> {
    let body: Record<string, any> = { epic: {} };
    if (updates.name !== undefined) body.epic.name = updates.name;
    if (updates.description !== undefined) body.epic.description = updates.description;
    if (updates.assignedToUser !== undefined)
      body.epic.assigned_to_user = updates.assignedToUser;
    if (updates.tags !== undefined) body.epic.tags = updates.tags.join(',');
    if (updates.workflowStatus !== undefined)
      body.epic.workflow_status = updates.workflowStatus;

    let response = await this.axios.put(`/epics/${epicId}`, body);
    let data = response.data as { epic: AhaEpic };
    return data.epic;
  }

  async deleteEpic(epicId: string): Promise<void> {
    await this.axios.delete(`/epics/${epicId}`);
  }

  // ─── Ideas ─────────────────────────────────────────────────────

  async listIdeas(params?: {
    productId?: string;
    page?: number;
    perPage?: number;
    updatedSince?: string;
  }): Promise<{ ideas: AhaIdea[]; pagination: AhaPagination }> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;
    if (params?.updatedSince) query.updated_since = params.updatedSince;

    let path = params?.productId ? `/products/${params.productId}/ideas` : '/ideas';

    let response = await this.axios.get(path, { params: query });
    let data = response.data as { ideas: AhaIdea[]; pagination: AhaPagination };
    return data;
  }

  async getIdea(ideaId: string): Promise<AhaIdea> {
    let response = await this.axios.get(`/ideas/${ideaId}`);
    let data = response.data as { idea: AhaIdea };
    return data.idea;
  }

  async createIdea(
    productId: string,
    idea: {
      name: string;
      description?: string;
      tags?: string[];
      workflowStatus?: string;
      skipPortal?: boolean;
    }
  ): Promise<AhaIdea> {
    let body: Record<string, any> = {
      idea: {
        name: idea.name
      }
    };
    if (idea.description) body.idea.description = idea.description;
    if (idea.tags) body.idea.tags = idea.tags.join(',');
    if (idea.workflowStatus) body.idea.workflow_status = idea.workflowStatus;
    if (idea.skipPortal) body.idea.skip_portal = true;

    let response = await this.axios.post(`/products/${productId}/ideas`, body);
    let data = response.data as { idea: AhaIdea };
    return data.idea;
  }

  async updateIdea(
    ideaId: string,
    updates: {
      name?: string;
      description?: string;
      tags?: string[];
      workflowStatus?: string;
    }
  ): Promise<AhaIdea> {
    let body: Record<string, any> = { idea: {} };
    if (updates.name !== undefined) body.idea.name = updates.name;
    if (updates.description !== undefined) body.idea.description = updates.description;
    if (updates.tags !== undefined) body.idea.tags = updates.tags.join(',');
    if (updates.workflowStatus !== undefined)
      body.idea.workflow_status = updates.workflowStatus;

    let response = await this.axios.put(`/ideas/${ideaId}`, body);
    let data = response.data as { idea: AhaIdea };
    return data.idea;
  }

  async deleteIdea(ideaId: string): Promise<void> {
    await this.axios.delete(`/ideas/${ideaId}`);
  }

  async searchIdeas(
    productId: string,
    term: string,
    params?: { page?: number; perPage?: number }
  ): Promise<{ ideas: AhaIdea[]; pagination: AhaPagination }> {
    let query: Record<string, any> = { q: term };
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.axios.get(`/products/${productId}/ideas`, { params: query });
    let data = response.data as { ideas: AhaIdea[]; pagination: AhaPagination };
    return data;
  }

  // ─── Goals ─────────────────────────────────────────────────────

  async listGoals(params?: {
    productId?: string;
    page?: number;
    perPage?: number;
    updatedSince?: string;
  }): Promise<{ goals: AhaGoal[]; pagination: AhaPagination }> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;
    if (params?.updatedSince) query.updated_since = params.updatedSince;

    let path = params?.productId ? `/products/${params.productId}/goals` : '/goals';

    let response = await this.axios.get(path, { params: query });
    let data = response.data as { goals: AhaGoal[]; pagination: AhaPagination };
    return data;
  }

  async getGoal(goalId: string): Promise<AhaGoal> {
    let response = await this.axios.get(`/goals/${goalId}`);
    let data = response.data as { goal: AhaGoal };
    return data.goal;
  }

  async createGoal(
    productId: string,
    goal: {
      name: string;
      description?: string;
    }
  ): Promise<AhaGoal> {
    let body: Record<string, any> = {
      goal: {
        name: goal.name
      }
    };
    if (goal.description) body.goal.description = goal.description;

    let response = await this.axios.post(`/products/${productId}/goals`, body);
    let data = response.data as { goal: AhaGoal };
    return data.goal;
  }

  async updateGoal(
    goalId: string,
    updates: {
      name?: string;
      description?: string;
    }
  ): Promise<AhaGoal> {
    let body: Record<string, any> = { goal: {} };
    if (updates.name !== undefined) body.goal.name = updates.name;
    if (updates.description !== undefined) body.goal.description = updates.description;

    let response = await this.axios.put(`/goals/${goalId}`, body);
    let data = response.data as { goal: AhaGoal };
    return data.goal;
  }

  async deleteGoal(goalId: string): Promise<void> {
    await this.axios.delete(`/goals/${goalId}`);
  }

  // ─── Initiatives ───────────────────────────────────────────────

  async listInitiatives(params?: {
    productId?: string;
    page?: number;
    perPage?: number;
    updatedSince?: string;
  }): Promise<{ initiatives: AhaInitiative[]; pagination: AhaPagination }> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;
    if (params?.updatedSince) query.updated_since = params.updatedSince;

    let path = params?.productId
      ? `/products/${params.productId}/initiatives`
      : '/initiatives';

    let response = await this.axios.get(path, { params: query });
    let data = response.data as { initiatives: AhaInitiative[]; pagination: AhaPagination };
    return data;
  }

  async getInitiative(initiativeId: string): Promise<AhaInitiative> {
    let response = await this.axios.get(`/initiatives/${initiativeId}`);
    let data = response.data as { initiative: AhaInitiative };
    return data.initiative;
  }

  async createInitiative(
    productId: string,
    initiative: {
      name: string;
      description?: string;
    }
  ): Promise<AhaInitiative> {
    let body: Record<string, any> = {
      initiative: {
        name: initiative.name
      }
    };
    if (initiative.description) body.initiative.description = initiative.description;

    let response = await this.axios.post(`/products/${productId}/initiatives`, body);
    let data = response.data as { initiative: AhaInitiative };
    return data.initiative;
  }

  async updateInitiative(
    initiativeId: string,
    updates: {
      name?: string;
      description?: string;
    }
  ): Promise<AhaInitiative> {
    let body: Record<string, any> = { initiative: {} };
    if (updates.name !== undefined) body.initiative.name = updates.name;
    if (updates.description !== undefined) body.initiative.description = updates.description;

    let response = await this.axios.put(`/initiatives/${initiativeId}`, body);
    let data = response.data as { initiative: AhaInitiative };
    return data.initiative;
  }

  async deleteInitiative(initiativeId: string): Promise<void> {
    await this.axios.delete(`/initiatives/${initiativeId}`);
  }

  // ─── Comments ──────────────────────────────────────────────────

  async listComments(
    recordType: string,
    recordId: string,
    params?: {
      page?: number;
      perPage?: number;
    }
  ): Promise<{ comments: AhaComment[]; pagination: AhaPagination }> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.axios.get(`/${recordType}/${recordId}/comments`, {
      params: query
    });
    let data = response.data as { comments: AhaComment[]; pagination: AhaPagination };
    return data;
  }

  async createComment(
    recordType: string,
    recordId: string,
    body: string
  ): Promise<AhaComment> {
    let response = await this.axios.post(`/${recordType}/${recordId}/comments`, {
      comment: { body }
    });
    let data = response.data as { comment: AhaComment };
    return data.comment;
  }

  async updateComment(commentId: string, body: string): Promise<AhaComment> {
    let response = await this.axios.put(`/comments/${commentId}`, {
      comment: { body }
    });
    let data = response.data as { comment: AhaComment };
    return data.comment;
  }

  async deleteComment(commentId: string): Promise<void> {
    await this.axios.delete(`/comments/${commentId}`);
  }

  // ─── Users ─────────────────────────────────────────────────────

  async listUsers(params?: {
    page?: number;
    perPage?: number;
    email?: string;
  }): Promise<{ users: AhaUser[]; pagination: AhaPagination }> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;
    if (params?.email) query.email = params.email;

    let response = await this.axios.get('/users', { params: query });
    let data = response.data as { users: AhaUser[]; pagination: AhaPagination };
    return data;
  }

  async getUser(userId: string): Promise<AhaUser> {
    let response = await this.axios.get(`/users/${userId}`);
    let data = response.data as { user: AhaUser };
    return data.user;
  }

  // ─── To-dos ────────────────────────────────────────────────────

  async listTodos(
    recordType: string,
    recordId: string,
    params?: {
      page?: number;
      perPage?: number;
    }
  ): Promise<{ todos: AhaTodo[]; pagination: AhaPagination }> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.axios.get(`/${recordType}/${recordId}/to_dos`, {
      params: query
    });
    let data = response.data as { to_dos: AhaTodo[]; pagination: AhaPagination };
    return { todos: data.to_dos, pagination: data.pagination };
  }

  async createTodo(
    recordType: string,
    recordId: string,
    todo: {
      name: string;
      body?: string;
      dueDate?: string;
      assignees?: string[];
    }
  ): Promise<AhaTodo> {
    let body: Record<string, any> = {
      to_do: {
        name: todo.name
      }
    };
    if (todo.body) body.to_do.body = todo.body;
    if (todo.dueDate) body.to_do.due_date = todo.dueDate;
    if (todo.assignees && todo.assignees.length > 0) {
      body.to_do.assignee_ids = todo.assignees;
    }

    let response = await this.axios.post(`/${recordType}/${recordId}/to_dos`, body);
    let data = response.data as { to_do: AhaTodo };
    return data.to_do;
  }

  async updateTodo(
    todoId: string,
    updates: {
      name?: string;
      body?: string;
      dueDate?: string;
      completed?: boolean;
    }
  ): Promise<AhaTodo> {
    let body: Record<string, any> = { to_do: {} };
    if (updates.name !== undefined) body.to_do.name = updates.name;
    if (updates.body !== undefined) body.to_do.body = updates.body;
    if (updates.dueDate !== undefined) body.to_do.due_date = updates.dueDate;
    if (updates.completed !== undefined) body.to_do.completed = updates.completed;

    let response = await this.axios.put(`/to_dos/${todoId}`, body);
    let data = response.data as { to_do: AhaTodo };
    return data.to_do;
  }

  async deleteTodo(todoId: string): Promise<void> {
    await this.axios.delete(`/to_dos/${todoId}`);
  }

  // ─── Me (Current User) ────────────────────────────────────────

  async getMe(): Promise<AhaUser> {
    let response = await this.axios.get('/me');
    let data = response.data as { user: AhaUser };
    return data.user;
  }
}
