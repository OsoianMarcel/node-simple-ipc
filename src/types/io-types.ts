export const enum IpcDataType {
  Input = 'I',
  Output = 'O',
  Event = 'E',
}

export interface IpcInput<D = unknown> {
  correlationId: string;
  name: string;
  data: D;
  type: IpcDataType.Input;
}

export interface SerializedError {
  message: string;
  name?: string;
  stack?: string;
}

export interface IpcOutput<D = unknown> {
  correlationId: string;
  name: string;
  data: D;
  error?: SerializedError;
  type: IpcDataType.Output;
}

export interface IpcEvent<D = unknown> {
  name: string;
  data?: D;
  type: IpcDataType.Event;
}
