declare module 'sql.js' {
  export interface Database {
    run(sql: string, params?: any[]): void;
    exec(sql: string, params?: any[]): Array<{ columns: string[]; values: any[][] }>;
    export(): Uint8Array;
    close(): void;
  }

  export interface SqlJsStatic {
    Database: new (data?: Uint8Array) => Database;
  }

  export default function initSqlJs(): Promise<SqlJsStatic>;
}

declare module 'node-schedule' {
  export function scheduleJob(cronExpression: string, callback: () => void): any;
  export function scheduleJob(date: Date, callback: () => void): any;
}

declare module 'node-global-key-listener' {
  export class GlobalKeyListener {
    constructor();
    addListener(callback: (event: any) => void): void;
    start(): void;
    stop(): void;
  }
}

declare module 'sql.js'; 