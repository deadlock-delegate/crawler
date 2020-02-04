const SocketClient = require('socketcluster-client')

class Peers {
  constructor (timeout = 2500) {
    this.timeout = timeout
    this.connections = new Map()
  }

  add (ip, port) {
    let connection = this.connections.get(ip)
    if (connection) {
      return connection
    }

    connection = SocketClient.create({
      hostname: ip,
      port,
      connectTimeout: this.timeout,
      ackTimeout: this.timeout,
      perMessageDeflate: true
    })

    const socket = connection.transport.socket
    if (socket._receiver) {
      socket._receiver._maxPayload = 100 * 1024
    }

    connection.on('error', () => {
      connection.destroy()
      this.connections.delete(ip)
    })

    this.connections.set(ip, connection)
    return connection
  }

  get (ip) {
    return this.connections.get(ip)
  }

  map () {
    return this.connections
  }

  disconnectAll () {
    for (const [ip, connection] of this.connections.entries()) {
      connection.destroy()
      this.connections.delete(ip)
    }
  }
}

module.exports = Peers
