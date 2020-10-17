const Client = require('./client')

class Peers {
  constructor (timeout = 10) {
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
      console.log(`    Socket error (peer ${ip}) : ${error.message}`)
      this.disconnect(ip)
    }

    try {
      await connection.connect({ retries: 1, timeout: this.timeout })
    } catch (err) {
      console.log(`    There was a problem connecting to`, ip)
    }

    this.connections.set(ip, connection)
    return connection
  }

  get (ip) {
    return this.connections.get(ip)
  }

  map () {
    return this.connections
  }

  async disconnect(ip) {
    try {
      await this.connections.get(ip).disconnect()
    } catch(err) {
      console.log(`    Error disconnecting from ${ip}: ${err}`)
    }
    this.connections.delete(ip)
  }

  async disconnectAll () {
    const connections = []
    for (const [ip, connection] of this.connections.entries()) {
      connections.push(new Promise((resolve, reject) => {
        connection.disconnect().then(() => {
          this.connections.delete(ip)
          resolve()
        }).catch(reject)
      }))
    }
    await Promise.all(connections)
  }
}

module.exports = Peers
