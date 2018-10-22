const axios = require('axios')
const delay = require('delay')
const { map, values } = require('lodash')

class Crawler {
  /**
   * Initializes the internal request reactor.
   * @method constructor
   */
  constructor (timeout = 5000) {
    this._counter = 0
    this._queue = []
    this.timeout = timeout
    setTimeout(() => { this.start() }, 100)
  }

  /**
   * Runs a height check on the entire network connected to the
   * initial node.
   * @method run
   * @param  {object}  node {ip: [address], port: [4001]}
   * @return {Promise}
   */
  async run (node) {
    this.heights = []
    this.nodes = {}
    this.startTime = new Date()

    await this.fetchNetwork(node)
    await this.scanNodes()
    console.log('done')

    return this;
  }

  /**
   * Enqueues a function to be run by the internal reactor.
   * @method queue
   * @param  {Function} fn Any function to be processed synchronously.
   * @return {void}
   */
  queue (fn) {
    this._queue.push(fn)
  }

  /**
   * Primary runner for the internal reactor.
   * @method start
   * @return {void}
   */
  start () {
    if (this._counter < 500 && this._queue.length > 0) {
      this._counter += 1
      setTimeout(() => { this._counter -= 1 }, 1000)
      this._queue.shift()()
      process.stdout.write('.')
      this.start()
    } else {
      setTimeout(() => { this.start() }, 100)
    }
  }

  /**
   * Walks the peer list starting with `node`
   * @method fetchNetwork
   * @param  {object}     node {ip: [address], port: [4001]}
   * @return {Promise}
   */
  fetchNetwork (node) {
    return new Promise((resolve) => {
      if (node.ip === '127.0.0.1') {
        // Ignore localhost
        resolve()
      } else {
        this.nodes[node.ip] = 'queued'
        this.queue(() => {
          axios
            .get(`http://${node.ip}:${node.port}/api/peers`, {timeout: this.timeout})
            .then((response) => { this.peerResponseSuccess(node, response).then(resolve) })
            .catch((err) => { this.peerResponseError(node, err).then(resolve) })
        })
      }
    })
  }

  /**
   * Logs when a connection error occurs attempting to get the peer list of `node`
   * @method peerResponseError
   * @param  {object}          node {ip: [address], port: [4001]}
   * @param  {error}           err  The error object
   * @return {Promise}
   */
  async peerResponseError (node, err) {
    if (!this.nodes[node.ip]) {
      this.nodes[node.ip] = 'error'
      console.error(`There was a problem getting peer list from http://${node.ip}:${node.port}`)
    }
    return true
  }

  /**
   * Handles a successful(ish) peer request
   * @method peerResponseSuccess
   * @param  {object}            peer     {ip: [address], port: [4001]}
   * @param  {axios response}    response response object from axios
   * @return {Promise}
   */
  peerResponseSuccess (peer, response) {
    if (response.status === 200 && response.data && response.data.peers) {
      this.nodes[peer.ip] = peer

      const promises = map(response.data.peers, (newPeer) => {
        if (this.nodes[newPeer.ip]) {
          return Promise.resolve()
        } else {
          return this.fetchNetwork(newPeer)
        }
      })

      return Promise.all(promises)
    } else {
      return this.peerResponseError(node, response)
    }
  }

  /**
   * Scans all available peer nodes for current height
   * @method scanNodes
   * @return {Promise}
   */
  scanNodes () {
    const promises = map(this.nodes, (peer, ip) => {
      if (peer === 'error') {
        return Promise.resolve()
      } else if (peer === 'queued') {
        console.log(`${ip} still queued`)
        return Promise.resolve()
      } else {
        return new Promise((resolve) => {
          this.queue(() => {
            axios
              .get(`http://${peer.ip}:${peer.port}/api/blocks/getHeight`, {timeout: this.timeout})
              .then((response) => { this.heightResponseSuccess(peer, response).then(resolve) })
              .catch((err) => { this.heightResponseError(peer, err).then(resolve) })
          })
        })
      }
    })

    return Promise.all(promises)
  }

  /**
   * Logs when an error occurs fetching a node's current height
   * @method heightResponseError
   * @param  {object}            node {ip: [address], port: [4001]}
   * @param  {error}             err  the error object
   * @return {Promise}
   */
  async heightResponseError (node, err) {
    console.error(`There was a problem getting the current height of http://${node.ip}:${node.port}`)
    console.error(err)
    return true
  }

  /**
   * Handles a successful height request
   * @method heightResponseSuccess
   * @param  {object}              node {ip: [address], port: [4001]}
   * @param  {axios response}      response response object from axios
   * @return {Promise}
   */
  heightResponseSuccess (node, response) {
    if (response.status === 200 && response.data && response.data.height) {
      this.heights.push({
        height: response.data.height,
        id: response.data.id
      })
      return Promise.resolve()
    } else {
      return this.heightResponseError(node, response)
    }
  }
}

module.exports = Crawler;
