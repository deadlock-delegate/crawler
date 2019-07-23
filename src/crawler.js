const { map } = require('lodash')
const Peers = require('./peer')

const VISITED = 1
const NOT_VISITED = 0
let NETWORK_P2P_PORT = null

class Crawler {
  /**
   * Initializes the internal request reactor.
   * @method constructor
   */
  constructor (timeout = 3000, disconnect = true) {
    this.timeout = timeout
    this.headers = {}
    this.socket = undefined
    this.disconnect = disconnect
    this.request = {
      headers: {
        nethash: 'no-nethash',
        version: 'no-version'
      }
    }

    this.peers = new Peers()
  }

  /**
   * Runs a height check on the entire network connected to the initial peer.
   * @method run
   * @param  {object}  peer {ip: [address], port: [4001]}
   * @return {Promise}
   */
  async run (peer) {
    this.nodes = {}
    this.heights = []
    this.samplePeers = {}
    this.startTime = new Date()

    NETWORK_P2P_PORT = peer.port

    if (!this.peers.get(peer.ip)) {
      this.peers.add(peer.ip, NETWORK_P2P_PORT)
    }

    try {
      console.log(`... discovering network peers`)
      await this.discoverPeers(peer)
      console.log(`... scanning network`)
      await this.scanNetwork()
      if (this.disconnect) {
        console.log(`... disconnecting from all peers`)
        this.peers.disconnectAll()
      }
    } catch (err) {
      console.error(err)
    }

    return this
  }

  async discoverPeers (peer) {
    return new Promise(async (resolve, reject) => {
      const connection = this.peers.get(peer.ip)
      if (!connection) {
        reject(new Error(`No connection exists for ${peer.ip}:${peer.port}`))
      }
      connection.emit(
        'p2p.peer.getPeers',
        this.request,
        (err, response) => {
          if (err) {
            console.error(`Error when calling p2p.peer.getPeers on ${peer.ip}`)
            return resolve()
          }

          if (peer.ip in this.samplePeers) {
            this.samplePeers[peer.ip] = VISITED
          }

          response.data.map((peer) => {
            if (!(peer.ip in this.nodes)) {
              this.nodes[peer.ip] = peer
            }

            if (!this.peers.get(peer.ip)) {
              this.peers.add(peer.ip, NETWORK_P2P_PORT)
            }
          })

          if (this.samplePeers[peer.ip] === VISITED) {
            return resolve()
          }

          // note: this is not very efficient on large arrays
          const samplePeers = response.data
            .map(x => ({ x, r: Math.random() }))
            .sort((a, b) => a.r - b.r)
            .map(a => a.x)
            .slice(0, 10)
            .filter(a => a.ip !== peer.ip)
            .map((peer) => {
              this.samplePeers[peer.ip] = NOT_VISITED
              return this.discoverPeers(peer)
            })

          Promise.all(samplePeers).then(resolve)
        }
      )
    })
  }

  scanNetwork () {
    const promises = map(this.nodes, (peer) => {
      return new Promise((resolve, reject) => {
        const connection = this.peers.get(peer.ip)
        if (!connection) {
          return resolve()
        }

        connection.emit(
          'p2p.peer.getStatus',
          this.request,
          (err, response) => {
            if (err) {
              console.error(`Error when calling p2p.peer.getStatus on ${peer.ip}`)
              return resolve()
            }
            this.heights.push({
              height: response.data.state.header.height,
              id: response.data.state.header.id
            })
            this.nodes[peer.ip].height = response.data.state.header.height
            this.nodes[peer.ip].id = response.data.state.header.id
            return resolve()
          }
        )
      })
    })

    return Promise.all(promises)
  }
}

module.exports = Crawler
