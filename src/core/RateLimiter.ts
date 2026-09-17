export interface RateLimiterConfig {
  maxTokens: number;      // الحد الأقصى للطلبات المسموحة في النافذة
  refillRatePerSec: number; // عدد الطلبات المضافة كل ثانية
}

export class RateLimiter {
  private capacity: number;
  private tokens: number;
  private refillRate: number;
  private lastRefillTimestamp: number;

  constructor(config: RateLimiterConfig) {
    this.capacity = config.maxTokens;
    this.tokens = config.maxTokens;
    this.refillRate = config.refillRatePerSec;
    this.lastRefillTimestamp = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillTimestamp) / 1000;
    const tokensToAdd = elapsedSeconds * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefillTimestamp = now;
  }

  public async acquire(cost: number = 1): Promise<void> {
    while (true) {
      this.refill();

      if (this.tokens >= cost) {
        this.tokens -= cost;
        return;
      }

      // حساب وقت الانتظار حتى يتوفر توكن كافٍ
      const missingTokens = cost - this.tokens;
      const waitTimeMs = Math.ceil((missingTokens / this.refillRate) * 1000);
      
      await new Promise((resolve) => setTimeout(resolve, Math.max(waitTimeMs, 10)));
    }
  }

  public tryAcquire(cost: number = 1): boolean {
    this.refill();
    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true;
    }
    return false;
  }

  public getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}