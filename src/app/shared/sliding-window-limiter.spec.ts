import { SlidingWindowLimiter } from './sliding-window-limiter';

describe('SlidingWindowLimiter', () => {
  it('lets 5 requests through, then makes the 6th wait for the window', async () => {
    let t = 0;
    const limiter = new SlidingWindowLimiter(5, 60_000, () => t);
    for (let i = 0; i < 5; i++) {
      await limiter.acquire();
      t += 1000;
    }
    expect(limiter.msUntilSlot()).toBe(55_000);
    t += 55_000;
    expect(limiter.msUntilSlot()).toBe(0);
  });

  it('pauses when told to by a 429', () => {
    const t = 0;
    const limiter = new SlidingWindowLimiter(5, 60_000, () => t);
    limiter.blockFor(10_000);
    expect(limiter.msUntilSlot()).toBe(10_000);
  });
});