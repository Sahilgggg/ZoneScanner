// An error that carries an HTTP status code for the error middleware.
export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export const badRequest = (message) => new HttpError(400, message)
export const notFound = (message) => new HttpError(404, message)
export const badGateway = (message) => new HttpError(502, message)
