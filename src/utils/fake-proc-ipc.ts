import { EventEmitter } from 'events';
import { IpcProcess } from '../types';

export class FakeIpcProcess extends EventEmitter implements IpcProcess {
  constructor(private sendCallback: (data: unknown) => boolean) {
    super();
  }

  send(data: unknown): boolean {
    return this.sendCallback(data);
  }
}

export class FakeIpc {
  public master: FakeIpcProcess;
  public child: FakeIpcProcess;

  constructor() {
    this.master = new FakeIpcProcess((data: unknown) => {
      return this.child.emit('message', data);
    });
    this.child = new FakeIpcProcess((data: unknown) => {
      return this.master.emit('message', data);
    });
  }
}
