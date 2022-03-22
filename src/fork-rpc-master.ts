import { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { TimeoutError, RpcError } from './errors';
import { RpcActOptions, RpcDataType, RpcInput, RpcOutput } from './types';
import { isRpcOutput, throwIfRpcNameInvalid, uniqueId } from './utils';

export class ForkRpcMaster extends EventEmitter {
  private childProc: ChildProcess;

  /**
   * Constructor.
   *
   * @param childProc Child NodeJS process.
   */
  constructor(childProc: ChildProcess) {
    super();

    this.childProc = childProc;
    this.childProc.on('message', this.onChildMessage.bind(this));
  }

  /**
   * Act an RPC endpoint.
   *
   * @param name RPC name.
   * @param data Optional data.
   * @param options Options.
   * @returns The response.
   */
  public act<DT = unknown>(
    name: string,
    data?: any,
    options: RpcActOptions = { timeout: 3e3 },
  ): Promise<DT> {
    throwIfRpcNameInvalid(name);

    const correlationId = uniqueId().toString();
    let timeoutId: NodeJS.Timeout;

    return new Promise((resolve, reject) => {
      // Event handler
      const listenReply = (rpcOutput: RpcOutput): void => {
        clearTimeout(timeoutId);

        if (rpcOutput.error) {
          reject(new RpcError(rpcOutput.error.message, rpcOutput.error));
        } else {
          resolve(rpcOutput.data);
        }
      };

      // Register event handler
      this.once(correlationId, listenReply);

      // Process timeout case
      timeoutId = setTimeout(() => {
        // Remove listener
        this.removeListener(correlationId, listenReply);
        // Throw timeout error
        reject(new TimeoutError(`Reply timeout. RPC name: ${name}.`));
      }, options.timeout);

      this.send({
        correlationId,
        name,
        data,
        type: RpcDataType.Input,
      });
    });
  }

  /**
   * Send RPC input via childProc.send.
   *
   * @param input Rpc input object.
   */
  private send(input: RpcInput): void {
    this.childProc.send(input);
  }

  private onChildMessage(data: unknown): void {
    if (!isRpcOutput(data)) {
      return;
    }
    const rpcOutput = data as RpcOutput;

    this.emit(rpcOutput.correlationId, rpcOutput);
  }
}
