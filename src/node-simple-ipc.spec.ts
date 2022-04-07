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

  it('should return math result master:server -> child:client.', () => {
    expect.assertions(1);

    childIpc.add<[number, number]>('math_add', ([a, b]) => a + b);

    return expect(masterIpc.act('math_add', [5, 10])).resolves.toEqual(15);
  });

  it('should return math result master:client <- child:server.', () => {
    expect.assertions(1);

    masterIpc.add('math_add', ([a, b]: [number, number]) => a + b);

    return expect(childIpc.act('math_add', [20, 2])).resolves.toEqual(22);
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
});
