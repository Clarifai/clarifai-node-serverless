export class BackoffIterator {
  private count: number;

  constructor({ count } = { count: 0 }) {
    this.count = count;
  }

  [Symbol.iterator]() {
    return this;
  }

  next(): IteratorResult<number> {
    if (this.count < 1) {
      this.count += 1;
      return { value: 0.1, done: false };
    } else if (this.count < 7) {
      this.count += 1;
      return { value: 0.01 * Math.pow(2, this.count + 4), done: false };
    } else {
      return { value: 0.01 * Math.pow(2, 10), done: false };
    }
  }
}
