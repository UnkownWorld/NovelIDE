/**
 * IdGenerator - ID 生成器类
 */
export class IdGenerator {
  private static instance: IdGenerator;
  private counter: number = 0;

  private constructor() {}

  static getInstance(): IdGenerator {
    if (!IdGenerator.instance) {
      IdGenerator.instance = new IdGenerator();
    }
    return IdGenerator.instance;
  }

  generate(): string {
    const timestamp = Date.now().toString(36);
    const counter = (this.counter++).toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `${timestamp}_${counter}_${random}`;
  }

  generateShort(length: number = 8): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
      const random = Math.random() * 16 | 0;
      const value = char === 'x' ? random : (random & 0x3 | 0x8);
      return value.toString(16);
    });
  }
}

const idGenerator = IdGenerator.getInstance();

export function generateId(): string {
  return idGenerator.generate();
}

export function generateShortId(length?: number): string {
  return idGenerator.generateShort(length);
}

export function generateUuid(): string {
  return idGenerator.generateUuid();
}
