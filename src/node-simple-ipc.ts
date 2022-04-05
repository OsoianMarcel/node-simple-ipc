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
  NodeSimpleIpcOptions,
  RemoveHandler,
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
  private ipcProcess: IpcProcess;
  private options: Required<NodeSimpleIpcOptions>;

  // Used for emitting and listening of events.
  private eventsEm: EventEmitter;

  // Used for RPC requests.
  private ipcEm: EventEmitter;

  private registeredRpcNames: Record<string, number> = {};

  private messageHandler: (msg: unknown) => void;

  private serviceStarted = false;

  /**
   * Constructor.
   *
   * @param ipcProcess IPC process (NodeJS.process or ChildProcess). By default "process" will be used.
   * @param options NodeSimpleIpc options.
   */
  constructor(
    ipcProcess: IpcProcess = process,
    options?: NodeSimpleIpcOptions,
  ) {
    this.ipcProcess = ipcProcess;
    this.options = {
      actTimeout: 30e3,
      startService: true,
      ...options,
    };

    this.messageHandler = this.onIpcMessage.bind(this);

    this.ipcEm = new EventEmitter();
    this.eventsEm = new EventEmitter();

    if (this.options.startService) {
      this.startService();
    }
  }

  /**
   * Starts the service.
   * By default the service is started on construction.
   *
   * @returns Returns a reference to the NodeSimpleIpc.
   */
  public startService(): this {
    if (this.serviceStarted) {
      return this;
    }

    this.serviceStarted = true;
    this.ipcProcess.on('message', this.messageHandler);

    return this;
  }

  /**
   * Stops the service.
   *
   * @returns Returns a reference to the NodeSimpleIpc.
   */
  public stopService(): this {
    this.serviceStarted = false;
    this.ipcProcess.off('message', this.messageHandler);

    return this;
  }

  private onIpcMessage(data: unknown): void {
    if (isIpcInput(data)) {
      // If RPC handler not found then send not found error.
      if (!(data.name in this.registeredRpcNames)) {
        this.sendOutput(data, {
          data: undefined,
          error: {
            message: `RPC "${data.name}" not found`,
          },
        });
        return;
      }

      // data.name
      return;
    }

    if (isIpcOutput(data)) {
      this.ipcEm.emit(data.correlationId, data);
      return;
    }

    if (isIpcEvent(data)) {
      this.eventsEm.emit(data.name, data.data);
      return;
    }
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
    options?: IpcActOptions,
  ): Promise<D> {
    assertValidIpcName(name);

    const finOpts: Required<IpcActOptions> = {
      timeout: this.options.actTimeout,
      ...options,
    };

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
      }, finOpts.timeout);

      this.sendInput({
        correlationId,
        name,
        data,
      });
    });
  }

  /**
   * Add a RPC.
   *
   * @param name RPC name.
   * @param handlerFn Handler function.
   * @returns Function you can call to remove the RPC.
   */
  public add<I = unknown, O = unknown>(
    name: string,
    handlerFn: IpcHandler<I, O>,
  ): RemoveHandler {
    assertValidIpcName(name);
    assertValidIpcHandler(handlerFn);

    if (name in this.registeredRpcNames) {
      throw new Error(`The RPC named "${name}" already exists.`);
    }

    this.registeredRpcNames[name] = 1;

    const messageListener = (message: unknown): void => {
      // Ignore all messages not related to this lib
      if (!isIpcInput(message)) {
        return;
      }

      const ipcInput = message as IpcInput<I>;

      // Pass only messages related to this endpoint
      if (ipcInput.name !== name) {
        return;
      }

      // Convert sync function to async for catching all errors
      new Promise((resolve) => resolve(handlerFn(ipcInput.data)))
        .then((data: unknown) => {
          this.sendOutput(ipcInput, { data });
        })
        .catch((err: unknown) => {
          this.sendOutput(ipcInput, {
            data: undefined,
            error: serializeError(err),
          });
        });
    };

    this.ipcProcess.on('message', messageListener);

    return () => {
      this.ipcProcess.off('message', messageListener);
    };
  }

  /**
   * Adds the listener function to the end of the listeners.
   *
   * @param event Event name.
   * @param handler Listener function.
   * @returns Function you can call to remove the event handler.
   */
  public on<T = unknown>(
    event: string,
    handler: EventHandler<T>,
  ): RemoveHandler {
    this.eventsEm.on(event, handler);

    return () => {
      this.eventsEm.off(event, handler);
    };
  }

  /**
   * Adds a one-time listener function for the event. The next time event is triggered, this listener is removed and then invoked.
   *
   * @param event Event name.
   * @param handler Listener function.
   * @returns Function you can call to remove the event handler.
   */
  public once<T = unknown>(
    event: string,
    handler: EventHandler<T>,
  ): RemoveHandler {
    this.eventsEm.once(event, handler);

    return () => {
      this.eventsEm.off(event, handler);
    };
  }

  /**
   * Removes the specified listener from the listener array.
   *
   * @param event Event name.
   * @param handler Listener function.
   * @returns Returns a reference to the NodeSimpleIpc.
   */
  public off<T = unknown>(event: string, handler: EventHandler<T>): void {
    this.eventsEm.off(event, handler);
  }

  /**
   * Send an event over IPC.
   *
   * @param event Event name.
   * @param data Event data (optional).
   * @returns The sending result.
   */
  public emit(event: string, data?: unknown): boolean {
    if (!this.ipcProcess.send)
      throw new Error('The send() method is not defined.');

    const ipcEvent: IpcEvent = {
      type: IpcDataType.Event,
      name: event,
      data,
    };

    return this.ipcProcess.send(ipcEvent);
  }

  /**
   * Send RPC output properties over IPC.
   *
   * @param input Input properties.
   * @param partialOutput Output properties (only data and error).
   * @returns The sending result.
   */
  private sendOutput(
    input: IpcInput,
    partialOutput: Pick<IpcOutput, 'data' | 'error'>,
  ): boolean {
    if (!this.ipcProcess.send)
      throw new Error('The send() method is not defined.');

    const output: IpcOutput = {
      ...partialOutput,
      correlationId: input.correlationId,
      name: input.name,
      type: IpcDataType.Output,
    };

    return this.ipcProcess.send(output);
  }

  /**
   * Send RPC input properties over IPC.
   *
   * @param partialInput Input properties.
   * @returns The sending result.
   */
  private sendInput(partialInput: Omit<IpcInput, 'type'>): boolean {
    if (!this.ipcProcess.send)
      throw new Error('The send() method is not defined.');

    const input: IpcInput = {
      ...partialInput,
      type: IpcDataType.Input,
    };

    return this.ipcProcess.send(input);
  }
}
