declare module 'sql.js' {
  export interface Database {
    exec(sql: string, params?: any[]): any[];
    close(): void;
  }

  export interface SqlJsStatic {
    (config?: any): Promise<Database>;
  }

  const initSqlJs: SqlJsStatic;
  export default initSqlJs;
}

declare module 'screenshot-desktop' {
  function screenshot(): Promise<Buffer>;
  export = screenshot;
}

declare module 'node-record-lpcm16' {
  function record(options?: any): any;
  export = record;
}

declare module 'node-wit' {
  export class Wit {
    constructor(token: string);
    message(message: string, context?: any): Promise<any>;
  }
}

declare module 'node-global-key-listener' {
  export class GlobalKeyboardListener {
    constructor();
    addListener(callback: (e: any) => void): void;
    start(): void;
    stop(): void;
  }
}

declare module 'node-key-sender' {
  export function sendKey(key: string): Promise<void>;
  export function sendKeys(keys: string[]): Promise<void>;
  export function sendCombination(keys: string[]): Promise<void>;
  export function sendText(text: string): Promise<void>;
}

declare module 'systeminformation' {
  export function currentLoad(): Promise<any>;
  export function mem(): Promise<any>;
  export function fsSize(): Promise<any>;
  export function cpu(): Promise<any>;
  export function osInfo(): Promise<any>;
}

declare module 'ps-list' {
  interface Process {
    pid: number;
    name: string;
    cpu?: number;
    memory?: number;
    cmd?: string;
  }
  
  function psList(): Promise<Process[]>;
  export = psList;
}

declare module 'node-cron' {
  function schedule(expression: string, func: () => void, options?: any): any;
  export = schedule;
}

declare module 'memory-cache' {
  class Cache {
    put(key: string, value: any, time?: number): void;
    get(key: string): any;
    del(key: string): void;
    clear(): void;
  }
  
  const cache: Cache;
  export = cache;
}

declare module 'chalk' {
  const chalk: {
    (text: string): string;
    red: (text: string) => string;
    green: (text: string) => string;
    yellow: (text: string) => string;
    blue: (text: string) => string;
    magenta: (text: string) => string;
    cyan: (text: string) => string;
    white: (text: string) => string;
    gray: (text: string) => string;
    bold: (text: string) => string;
  };
  export = chalk;
}

declare module 'ora' {
  interface OraOptions {
    text?: string;
    color?: string;
    spinner?: string;
  }
  
  function ora(options?: OraOptions | string): {
    start(text?: string): void;
    stop(): void;
    succeed(text?: string): void;
    fail(text?: string): void;
    warn(text?: string): void;
    info(text?: string): void;
  };
  
  export = ora;
}

declare module 'commander' {
  export class Command {
    option(flags: string, description?: string, defaultValue?: any): this;
    parse(argv?: string[]): this;
    on(event: string, listener: (...args: any[]) => void): this;
  }
  
  export const program: Command;
}

declare module 'inquirer' {
  interface Question {
    type: string;
    name: string;
    message: string;
    choices?: any[];
    default?: any;
  }
  
  function prompt(questions: Question[]): Promise<any>;
  const inquirer: { prompt: typeof prompt };
  export = inquirer;
}

declare module 'conf' {
  class Conf {
    constructor(options?: any);
    get(key: string): any;
    set(key: string, value: any): void;
    delete(key: string): void;
    clear(): void;
  }
  
  export = Conf;
}

declare module 'electron-store' {
  class Store {
    constructor(options?: any);
    get(key: string): any;
    set(key: string, value: any): void;
    delete(key: string): void;
    clear(): void;
  }
  
  export = Store;
}

declare module 'node-notifier' {
  interface NotificationOptions {
    title?: string;
    message?: string;
    icon?: string;
    sound?: boolean;
  }
  
  function notify(options: NotificationOptions): void;
  export = notify;
}

declare module 'node-schedule' {
  export function scheduleJob(cronExpression: string, callback: () => void): any;
  export function scheduleJob(date: Date, callback: () => void): any;
} 