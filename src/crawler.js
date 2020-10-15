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
  constructor (timeout = 2500, disconnect = true, sampleSize = 10) {
    this.headers = {}
    this.timeout = timeout
    this.socket = undefined
    this.disconnect = disconnect
    this.request = {
      data: {},
      headers: {
        'Content-Type': 'application/json'
      }
    }
    this.sampleSize = sampleSize

    this.peers = new Peers(this.timeout)
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
      await this.peers.add(peer.ip, NETWORK_P2P_PORT)
    }

    try {
      console.log('... discovering network peers')
      await this.discoverPeers(peer)
      console.log('... scanning network')
      await this.scanNetwork()
      if (this.disconnect) {
        console.log('... disconnecting from all peers')
        this.peers.disconnectAll()
      }
    } catch (err) {
      console.error(err)
    }

    return this
  }

  async discoverPeers (peer) {
    return new Promise((resolve, reject) => {
      const connection = this.peers.get(peer.ip)
      if (!connection) {
        reject(new Error(`No connection exists for ${peer.ip}:${peer.port}`))
      }

      const options = {
          path: 'p2p.peer.getPeers',
          headers: {},
          method: "POST",
          payload: {},
      };

      connection.request(options)
        .then(async (response) => {

          if (peer.ip in this.samplePeers) {
            this.samplePeers[peer.ip] = VISITED
          }

          const test = await response.payload.map(async (peer) => {
            if (!(peer.ip in this.nodes)) {
              this.nodes[peer.ip] = peer
            }

            if (!this.peers.get(peer.ip)) {
              await this.peers.add(peer.ip, NETWORK_P2P_PORT)
            }
          })

          await Promise.all(test)
          
          if (this.samplePeers[peer.ip] === VISITED) {
            return resolve()
          }

          // note: this is not very efficient on large arrays
          const samplePeers = response.payload
            .map(x => ({ x, r: Math.random() }))
            .sort((a, b) => a.r - b.r)
            .map(a => a.x)
            .slice(0, this.sampleSize)
            .filter(a => a.ip !== peer.ip)
            .map((peer) => {
              this.samplePeers[peer.ip] = NOT_VISITED
              return this.discoverPeers(peer)
            })
          await Promise.all(samplePeers).then(resolve)
        }
      ).catch(err => {
          console.error(`Error when calling p2p.peer.getPeers on ${peer.ip}: ${err}`)
          return resolve()
      })
    })
  }

  scanNetwork () {
    const promises = map(this.nodes, (peer) => {
      return new Promise((resolve) => {
        const connection = this.peers.get(peer.ip)
        if (!connection) {
          return resolve()
        }
        const options = {
            path: 'p2p.peer.getStatus',
            headers: {},
            method: "POST",
            payload: {},
        };
        connection.request(options)
          .then((response) => {
            this.heights.push({
              height: response.payload.state.header.height,
              id: response.payload.state.header.id
            })
            this.nodes[peer.ip].height = response.payload.state.header.height
            this.nodes[peer.ip].id = response.payload.state.header.id
            this.nodes[peer.ip].version = response.payload.config.version
            return resolve()
          }
        ).catch(err => {
          console.error(`Error when calling p2p.peer.getStatus on ${peer.ip}: ${err}`)
          return resolve()
        })
      })
    })

    return Promise.all(promises)
  }
}

module.exports = Crawler
