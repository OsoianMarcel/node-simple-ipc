import { EventEmitter } from 'events';
import { TimeoutError, RemoteError } from './errors';
import {
  IpcInput,
  IpcOutput,
  IpcEvent,
  IpcDataType,
  IpcProcess,
  IpcActOptions,
  IpcHandler,
  EventHandler,
} from './types';
import {
  serializeError,
  isIpcEvent,
  isIpcInput,
  isIpcOutput,
  assertValidIpcName,
  assertValidIpcHandler,
  uniqueId,
} from './utils';

export class NodeSimpleIpc {
  private ipcProc: IpcProcess;

  private eventsEm: EventEmitter;
  private ipcEm: EventEmitter;
  private registeredRpcNames: Record<string, number> = {};

  /**
   * Constructor.
   *
   * @param ipcProc IPC process (NodeJS.process or ChildProcess). By default "process" will be used.
   */
  constructor(ipcProc: IpcProcess = process) {
    this.ipcProc = ipcProc;
    this.ipcProc.on('message', this.onChildMessage.bind(this));

    this.ipcEm = new EventEmitter();
    this.eventsEm = new EventEmitter();
  }

  /**
   * Start a request.
   *
   * @param name Endpoint name.
   * @param data Request data (optional).
   * @param options Request options.
   * @returns The response.
   */
  public act<D = unknown>(
    name: string,
    data?: unknown,
    options: IpcActOptions = { timeout: 30e3 },
  ): Promise<D> {
    assertValidIpcName(name);

    const correlationId = uniqueId().toString();
    let timeoutId: NodeJS.Timeout;

    return new Promise((resolve, reject) => {
      // Event handler
      const listenReply = (ipcOutput: IpcOutput<D>): void => {
        clearTimeout(timeoutId);

        if (ipcOutput.error) {
          reject(new RemoteError(ipcOutput.error.message, ipcOutput.error));
        } else {
          resolve(ipcOutput.data);
        }
      };

      // Register event handler
      this.ipcEm.once(correlationId, listenReply);

      // Process timeout case
      timeoutId = setTimeout(() => {
        // Remove listener
        this.ipcEm.off(correlationId, listenReply);
        // Throw timeout error
        reject(new TimeoutError(`Reply timeout. IPC name: ${name}.`));
      }, options.timeout);

      this.sendInput({
        correlationId,
        name,
        data,
        type: IpcDataType.Input,
      });
    });
  }

  /**
   * Add an endpoint.
   *
   * @param name Endpoint name.
   * @param handlerFn Handler function.
   * @returns Returns a reference to the NodeSimpleIpc.
   */
  public add<I = unknown, O = unknown>(
    name: string,
    handlerFn: IpcHandler<I, O>,
  ): this {
    assertValidIpcName(name);
    assertValidIpcHandler(handlerFn);

    if (name in this.registeredRpcNames) {
      throw new Error(`The RPC named "${name}" already exists.`);
    }

    this.registeredRpcNames[name] = 1;

    this.ipcProc.on('message', (message: unknown) => {
      // Ignore all messages not related to this lib
      if (!isIpcInput(message)) {
        return;
      }

      const ipcInput = message as IpcInput<I>;

      // Pass only messages related to this endpoint
      if (ipcInput.name !== name) {
        return;
      }

      const ipcOutput: IpcOutput = {
        correlationId: ipcInput.correlationId,
        name: ipcInput.name,
        type: IpcDataType.Output,
        data: undefined,
      };

      // Convert sync function to async
      new Promise((resolve) => resolve(handlerFn(ipcInput.data)))
        .then((res: unknown) => {
          this.sendOutput({
            ...ipcOutput,
            data: res,
          });
        })
        .catch((err: unknown) => {
          this.sendOutput({
            ...ipcOutput,
            error: serializeError(err),
          });
        });
    });

    return this;
  }

  /**
   * Emit an event.
   *
   * @param event Event name.
   * @param data Event data.
   * @returns Returns true if the event has been sent.
   */
  public emit(event: string, data?: unknown): boolean {
    if (!this.ipcProc.send) return false;

    const ipcEvent: IpcEvent = {
      type: IpcDataType.Event,
      name: event,
      data,
    };

    return this.ipcProc.send(ipcEvent);
  }

  /**
   * Adds the listener function to the end of the listeners.
   *
   * @param event Event name.
   * @param handler Listener function.
   * @returns Returns a reference to the NodeSimpleIpc.
   */
  public on<T = unknown>(event: string, handler: EventHandler<T>): this {
    this.eventsEm.on(event, handler);

    return this;
  }

  /**
   * Adds a one-time listener function for the event. The next time event is triggered, this listener is removed and then invoked.
   *
   * @param event Event name.
   * @param handler Listener function.
   * @returns Returns a reference to the NodeSimpleIpc.
   */
  public once<T = unknown>(event: string, handler: EventHandler<T>): this {
    this.eventsEm.once(event, handler);

    return this;
  }

  /**
   * Removes the specified listener from the listener array.
   *
   * @param event Event name.
   * @param handler Listener function.
   * @returns Returns a reference to the NodeSimpleIpc.
   */
  public off<T = unknown>(event: string, handler: EventHandler<T>): this {
    this.eventsEm.off(event, handler);

    return this;
  }

  private sendOutput(output: IpcOutput): boolean {
    if (!this.ipcProc.send) return false;

    return this.ipcProc.send(output);
  }

  private sendInput(input: IpcInput): boolean {
    if (!this.ipcProc.send) return false;

    return this.ipcProc.send(input);
  }

  private onChildMessage(data: unknown): void {
    if (isIpcOutput(data)) {
      this.ipcEm.emit(data.correlationId, data);
    }

    if (isIpcEvent(data)) {
      this.eventsEm.emit(data.name, data.data);
    }
  }
}
