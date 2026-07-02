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
