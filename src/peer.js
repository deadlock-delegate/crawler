const SocketClient = require('socketcluster-client')

class Peers {
  constructor () {
    this.connections = new Map()
  }

  add (ip, port) {
    let connection = this.connections.get(ip)
    if (connection) {
      return connection
    }
    connection = SocketClient.create({ hostname: ip, port, connectTimeout: 2000 })
    connection.on('error', (err) => {
      console.error(err)
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
