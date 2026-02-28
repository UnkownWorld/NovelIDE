/**
 * Debouncer - 防抖工具类
 * 
 * 提供可复用的防抖功能，支持立即执行和取消操作
 */
export class Debouncer<T extends (...args: any[]) => any> {
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private lastArgs: Parameters<T> | null = null;
  private readonly wait: number;
  private readonly fn: T;

  constructor(fn: T, wait: number) {
    this.fn = fn;
    this.wait = wait;
  }

  call(...args: Parameters<T>): void {
    this.lastArgs = args;
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
    }
    this.timeoutId = setTimeout(() => {
      if (this.lastArgs !== null) {
        this.fn(...this.lastArgs);
        this.lastArgs = null;
      }
      this.timeoutId = null;
    }, this.wait);
  }

  flush(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.lastArgs !== null) {
      this.fn(...this.lastArgs);
      this.lastArgs = null;
    }
  }

  cancel(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.lastArgs = null;
  }

  isPending(): boolean {
    return this.timeoutId !== null;
  }
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  const debouncer = new Debouncer(fn, wait);
  return (...args: Parameters<T>) => debouncer.call(...args);
}
