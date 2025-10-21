export class ProgrammablePromise<T> {
  private _resolve!: (value: T | PromiseLike<T>) => void;
  private _reject!: (reason?: any) => void;
  private _promise: Promise<T>;
  private _value!: T;

  constructor() {
    this._promise = new Promise<T>((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }

  get promise() {
    return this._promise;
  }

  resolve(value: T | PromiseLike<T>) {
    this._resolve(value);
    this._value = value as T;
  }

  get reject() {
    return this._reject;
  }

  get value() {
    return this._value;
  }
}
