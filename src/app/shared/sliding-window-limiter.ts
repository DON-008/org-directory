import { sleep } from './sleep';

/** Extra wait so our clock and the server's clock never disagree by a few milliseconds. */
const SAFETY_MS = 250;

/** Allows at most `limit` sends in any rolling `windowMs`. */
export class SlidingWindowLimiter {
  private readonly sent: number[] = [];
  private blockedUntil = 0;

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** Milliseconds until a request may be sent. 0 means now. */
  msUntilSlot(): number {
    const now = this.now();
    while (this.sent.length && now - this.sent[0] >= this.windowMs) this.sent.shift();
    const windowWait = this.sent.length < this.limit ? 0 : this.sent[0] + this.windowMs - now;
    return Math.max(windowWait, this.blockedUntil - now, 0);
  }

  /** Waits until a slot is free, then reserves it. */
  async acquire(): Promise<void> {
    for (;;) {
      const wait = this.msUntilSlot();
      if (wait <= 0) break;
      await sleep(wait + SAFETY_MS);
    }
    this.sent.push(this.now());
  }

  /** Used when the server says 429: pause everything for `ms`. */
  blockFor(ms: number): void {
    this.blockedUntil = Math.max(this.blockedUntil, this.now() + ms);
  }
}