declare module 'node-routeros' {
  export interface RouterOSAPIOptions {
    host: string;
    port?: number;
    user: string;
    password: string;
    timeout?: number;
    tls?: boolean;
  }

  export class RouterOSAPI {
    connected: boolean;
    constructor(options: RouterOSAPIOptions);
    connect(): Promise<RouterOSAPI>;
    close(): void;
    write(command: string | string[]): Promise<Record<string, string>[]>;
  }
}
