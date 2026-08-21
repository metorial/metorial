export class State<T> {
  #value: T;

  get value() {
    return this.#value;
  }

  get() {
    return this.#value;
  }

  set(value: T) {
    this.#value = value;
  }

  constructor(initialValue: T) {
    this.#value = initialValue;
  }
}

/** Request-scoped classified data is deliberately kept out of reusable protocol State. */
export class EphemeralRequestState<T> {
  #values = new Map<string, T>();

  async run<Result>(requestId: string, value: T, handler: (value: T) => Promise<Result>) {
    if (this.#values.has(requestId)) {
      throw new Error('Request-scoped state already exists for this request ID');
    }
    this.#values.set(requestId, value);
    try {
      return await handler(value);
    } finally {
      this.#values.delete(requestId);
    }
  }

  get size() {
    return this.#values.size;
  }
}
