const Client = require('./client')

class Peers {
  constructor (timeout = 2500) {
    this.timeout = timeout
    this.connections = new Map()
  }

  async add (ip, port) {
    let connection = this.connections.get(ip)
    if (connection) {
      return connection
    }

    connection = new Client(`ws://${ip}:${port}`)

    connection.onError = (error) => {
      console.log(`Socket error (peer ${ip}) : ${error.message}`);
    };

    await connection.connect({ retries: 1 });

    this.connections.set(ip, connection)
    return connection
  }

  get (ip) {
    return this.connections.get(ip)
  }

  map () {
    return this.connections
  }

  async disconnectAll () {
    for (const [ip, connection] of this.connections.entries()) {
      await connection.disconnect()
      this.connections.delete(ip)
    }
  }
}

module.exports = Peers
