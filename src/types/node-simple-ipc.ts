export interface IpcActOptions {
  /** Act timeout in miliseconds. */
  timeout?: number;
}

export interface NodeSimpleIpcOptions {
  /** Default act timeout in miliseconds. */
  actTimeout?: number;
  startService?: boolean;
}

export interface IpcProcess {
  send?(data: object): boolean;
  on(eventName: string, listener: (data: unknown) => void): void;
  off(eventName: string, listener: (data: unknown) => void): void;
}

export type IpcHandler<I = unknown, O = unknown> = (i: I) => O;

export type EventHandler<T = unknown> = (data: T) => void;
