# node-simple-ipc

A library created on top of Node.js IPC, which simplify communication between master and child processes via RPC and Events.

[![npm version](https://img.shields.io/npm/v/react.svg?style=flat)](https://www.npmjs.com/package/node-simple-ipc)
[![license](https://img.shields.io/github/license/mashape/apistatus.svg)](https://github.com/OsoianMarcel/node-simple-ipc/blob/main/LICENSE)

## Install

Install via npm,

```
npm install node-simple-ipc
```

## Quick Example

master.js - the master process who spawn child process:

```javascript
const { fork } = require('child_process');
const { NodeSimpleIpc } = require('node-simple-ipc');

// Spawns the child process
const childProcess = fork('./child.js');

// Creates a new instance of NodeSimpleIpc
const rpc = new NodeSimpleIpc(childProcess);

// Request "get_time" endpoint and receive the response
rpc.act('get_time').then((time) => console.log('current time:', time));

// Request "math_add" endpoint and receive the math result
rpc.act('math_add', [5, 10, 100]).then((result) => {
  console.log('math result:', result);
});

// Register "ping_master" RPC on master side
rpc.add('ping_master', () => 'pong from master');
```

child.js - the child porcess spawned from the master:

```javascript
const { NodeSimpleIpc } = require('node-simple-ipc');

// Creates a new instance of NodeSimpleIpc
const rpc = new NodeSimpleIpc(process);

// Register "get_time" endpoint
rpc.add('get_time', () => Date.now());

// Register "math_add" endpoint
rpc.add('math_add', (numbers) => {
  return numbers.reduce((a, b) => a + b, 0);
});

// Request "ping_master" endpoint and receive the math result
rpc.act('ping_master').then((result) => {
  console.log('master ping response:', result);
});
```

Console output:

```
master ping response: pong from master
current time: 1648818853923
math result: 115
```

## Contribute

Contributions to the package are always welcome!

- Report any bugs or issues you find on the [issue tracker].
- You can grab the source code at the package's [Git repository].

## Donation

Give me a Star if you like it. 😊

## License

All contents of this package are licensed under the [MIT license].

[issue tracker]: https://github.com/OsoianMarcel/node-simple-ipc/issues
[git repository]: https://github.com/OsoianMarcel/node-simple-ipc
[mit license]: LICENSE
