import { RemoteError, TimeoutError } from './errors';
import { NodeSimpleIpc } from './node-simple-ipc';
import { FakeIpc } from './utils/fake-proc-ipc';

describe('NodeSimpleIpc', function () {
  let fakeIpc: FakeIpc, masterIpc: NodeSimpleIpc, childIpc: NodeSimpleIpc;

  beforeEach(() => {
    fakeIpc = new FakeIpc();
    masterIpc = new NodeSimpleIpc(fakeIpc.master);
    childIpc = new NodeSimpleIpc(fakeIpc.child);
  });

  it('should return math result master:client -> child:server.', () => {
    expect.assertions(1);

    childIpc.add<[number, number]>('math_add', ([a, b]) => a + b);

    return expect(masterIpc.act('math_add', [5, 10])).resolves.toEqual(15);
  });

  it('should return math result master:server <- child:client.', () => {
    expect.assertions(1);

    masterIpc.add('math_add', ([a, b]: [number, number]) => a + b);

    return expect(childIpc.act('math_add', [20, 2])).resolves.toEqual(22);
  });

  it('should respect the correlation between different responses to the same endpoint.', () => {
    expect.assertions(1);

    childIpc.add('echo', (input: string): string => {
      return input;
    });

    return expect(
      Promise.all([
        masterIpc.act('echo', '1'),
        masterIpc.act('echo', '2'),
        masterIpc.act('echo', '3'),
      ]),
    ).resolves.toEqual(['1', '2', '3']);
  });

  it('should work with async RPC endpoints.', () => {
    expect.assertions(1);

    masterIpc.add('echo_with_1ms_delay', async (input: string) => {
      return new Promise((resolve) => setTimeout(() => resolve(input), 1));
    });

    return expect(
      childIpc.act('echo_with_1ms_delay', 'Hello!'),
    ).resolves.toEqual('Hello!');
  });

  it('should throw RemoteError when an error occurs on RPC handler.', () => {
    expect.assertions(1);

    masterIpc.add('error_endpoint', () => {
      throw new Error('Something bad happened.');
    });

    return expect(childIpc.act('error_endpoint')).rejects.toThrow(RemoteError);
  });

  it('should throw TimeoutError when request timed out.', () => {
    expect.assertions(1);

    masterIpc.add('error_endpoint', async () => {
      await new Promise((resolve) => setTimeout(() => resolve, 200));
    });

    return expect(
      childIpc.act('error_endpoint', undefined, { timeout: 100 }),
    ).rejects.toThrow(TimeoutError);
  });

  it('should throw an error when RPC endpoint name already exists.', () => {
    // Add "rpc1" first time.
    masterIpc.add('rpc1', () => undefined);

    // Add "rpc1" second time.
    expect(() => masterIpc.add('rpc1', () => null)).toThrow(Error);
  });

  it('should throw a not found error when RPC endpoint does not exists.', () => {
    expect.assertions(1);

    return expect(() =>
      masterIpc.act('inexistend_endpoint', () => undefined),
    ).rejects.toThrow('RPC "inexistend_endpoint" not found.');
  });

  it('should remove RPC endpoint.', () => {
    expect.assertions(2);

    const removeRpc = masterIpc.add('to_remove', () => 'I am still alive!');

    expect(typeof removeRpc).toBe('function');

    removeRpc();

    return expect(() => childIpc.act('to_remove')).rejects.toThrow(
      'RPC "to_remove" not found.',
    );
  });

  it('should receive an event where master:publisher -> child:receiver', () => {
    const mockCallback = jest.fn((x) => x);

    childIpc.on('nice_event', mockCallback);
    masterIpc.emit('nice_event', 'one');
    masterIpc.emit('nice_event', 'two');

    expect(mockCallback).toBeCalledTimes(2);
    expect(mockCallback.mock.results[0].value).toEqual('one');
    expect(mockCallback.mock.results[1].value).toEqual('two');
  });

  it('should receive an event where master:receiver <- child:publisher', () => {
    const mockCallback = jest.fn((x) => x);

    masterIpc.on('nice_event', mockCallback);
    childIpc.emit('nice_event', '1');
    childIpc.emit('nice_event', '2');
    childIpc.emit('nice_event', '3');

    expect(mockCallback).toBeCalledTimes(3);
    expect(mockCallback.mock.results[0].value).toEqual('1');
    expect(mockCallback.mock.results[1].value).toEqual('2');
    expect(mockCallback.mock.results[2].value).toEqual('3');
  });

  it('should receive an event only once', () => {
    const mockCallback = jest.fn((x) => x);

    masterIpc.once('only_once', mockCallback);
    childIpc.emit('only_once', '1');
    childIpc.emit('only_once', '2');

    expect(mockCallback).toBeCalledTimes(1);
    expect(mockCallback).toBeCalledWith('1');
  });

  it('should unsubscribe from the event by using off() method', () => {
    const mockCallback = jest.fn((x) => x);

    masterIpc.on('sub_receive_unsub', mockCallback);
    childIpc.emit('sub_receive_unsub', '1');
    masterIpc.off('sub_receive_unsub', mockCallback);
    childIpc.emit('sub_receive_unsub', '2');

    expect(mockCallback).toBeCalledTimes(1);
    expect(mockCallback).toBeCalledWith('1');
  });

  it('should unsubscribe from the event by using remove function.', () => {
    // Test on()
    const mockCallbackOn = jest.fn((x) => x);
    const onUnsub = masterIpc.on('on_unsub', mockCallbackOn);
    childIpc.emit('on_unsub', '1');
    onUnsub();
    childIpc.emit('on_unsub', '2');

    expect(mockCallbackOn).toBeCalledTimes(1);
    expect(mockCallbackOn).toBeCalledWith('1');

    // Test once()
    const mockCallbackOnce = jest.fn((x) => x);
    const onceUnsub = masterIpc.once('once_unsub', mockCallbackOnce);
    onceUnsub();
    childIpc.emit('once_unsub', '1');

    expect(mockCallbackOnce).toBeCalledTimes(0);
  });
});
