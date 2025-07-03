// Ring buffer for transcript snippets
export class RingBuffer<T> {
  private buffer: T[] = [];
  private maxLen: number;
  constructor(maxLen: number) { this.maxLen = maxLen; }
  push(item: T) {
    this.buffer.push(item);
    if (this.buffer.length > this.maxLen) this.buffer.shift();
  }
  getAll() { return [...this.buffer]; }
  clear() { this.buffer = []; }
}
// Add more audio utils as needed 