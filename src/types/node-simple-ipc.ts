export interface IpcActOptions {
  /** Act timeout in miliseconds. */
  timeout?: number;
}

export interface IpcProcess {
  send?(data: object): boolean;
  on(message: string, event: unknown): void;
}

export type IpcHandler<I = unknown, O = unknown> = (i: I) => O;

export type EventHandler<T = unknown> = (data: T) => void;
