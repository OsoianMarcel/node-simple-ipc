import EventEmitter from 'events';
import { RpcDataType, RpcInput, RpcOutput, RpcRemoteError } from './types';
import {
  throwIfRpcNameInvalid,
  throwIfRpcHandlerInvalid,
  isRpcInput,
} from './utils';

export class ForkRpcChild extends EventEmitter {
  constructor() {
    super();

    if (process.send === undefined) {
      throw new Error(
        '"process.send" is undefined. ' +
          'Make sure the script was not spawned with an IPC channel.',
      );
    }
  }

  /**
   * Add RPC listener.
   *
   * @param name RPC name.
   * @param handlerFn RPC handler function.
   */
  public add(name: string, handlerFn: (p: any) => any): void {
    throwIfRpcNameInvalid(name);
    throwIfRpcHandlerInvalid(handlerFn);

    process.on('message', (message: unknown) => {
      // Ignore all messages not related to this lib
      if (!isRpcInput(message)) {
        return;
      }

      // Convert message to RpcInput
      const rpcInput = message as RpcInput;

      // Pass only messages related to this endpoint
      if (rpcInput.name !== name) {
        return;
      }

      const rpcOutput: RpcOutput = {
        correlationId: rpcInput.correlationId,
        name: rpcInput.name,
        type: RpcDataType.Output,
      };

      // Convert sync function to async
      new Promise((resolve) => resolve(handlerFn(rpcInput.data)))
        .then((res: unknown) => {
          this.send({
            ...rpcOutput,
            data: res,
          });
        })
        .catch((err: unknown) => {
          this.send({
            ...rpcOutput,
            error: this.errorToRpcError(err),
          });
        });
    });
  }

  private errorToRpcError(err: unknown): RpcRemoteError {
    if (err instanceof Error) {
      return {
        name: err.name,
        stack: err.stack,
        message: err.message,
      };
    }

    return {
      message: String(err),
    };
  }

  /**
   * Send RPC output via process.send.
   *
   * @param output Rpc ouput object.
   */
  private send(output: RpcOutput): void {
    process.send && process.send(output);
  }
}
