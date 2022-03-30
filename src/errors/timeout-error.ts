export class TimeoutError extends Error {
  constructor(message = 'Timeout error.') {
    super(message);
    this.name = TimeoutError.name;
  }
}
