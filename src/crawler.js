const axios = require('axios')
const delay = require('delay')

module.exports = class Crawler {

  constructor (timeout=3000) {
    this.queued = []
    this.visited = []
    this.scanned = []
    this.timeout = timeout
  }

   async run (node) {
    this.startTime = null
    this.running = 0
    this.startTime = new Date()
    this.queued.push(node)
    this.processQueue()
    this._checkWhenFinished()
  }

  /**
   * [_checkWhenFinished recursive loop, checking when there are no more running processes]
   * @return {[void]}
   */
  async _checkWhenFinished () {
    if (this.running === 0) {
      this._report()
    } else {
      await delay(500)
      this._checkWhenFinished()
    }
  }

  /**
   * [processQueue processes the queue]
   * @return {[void]}
   */
  async processQueue () {
    while (this.queued.length > 0) {
      const node = this.queued.shift()
      this._getNode(node)
    }
  }

  /**
   * [_report runs a report of the block heights and block ids]
   * @return {[void]}
   */
  async _report () {
    let blockStats = {}
    for (const item of this.scanned) {
      if (!blockStats[item.height]) {
        blockStats[item.height] = {}
        blockStats[item.height].count = 1
        blockStats[item.height].ids = {}
        blockStats[item.height].ids[item.id] = 1
      } else {
        blockStats[item.height].count += 1
        blockStats[item.height].ids[item.id] += 1
      }
    }

    console.log(`===========================================`)
    console.log(`Total nodes visited: ${this.visited.length}`)
    console.log(`Total nodes online: ${this.scanned.length}`)
    console.log(`------------------------------------------`)
    console.log(`Block stats:`)
    console.log(blockStats)
    console.log(`------------------------------------------`)
    console.log(`Finished scanning in ${new Date() - this.startTime}ms`)
  }

  /**
   * [_getNode gets data from a node]
   * @param  {[Object]} node
   * @return {[void]}
   */
  async _getNode (node) {
    this.running += 2
    this.visited.push(node.ip)
    this._getPeerList(node)
      .then(peers => {
        for (const peer of peers) {
          if (this.visited.includes(peer.ip)) {
            continue
          }
          this.queued.push(peer)
        }
        if (this.queued.length) {
          this.processQueue()
        }
        this.running--
      })
      .catch(err => {
        console.error(`There was a problem getting peer list from http://${node.ip}:4003`)
        this.running--
      })

    this._getHeight(node)
      .then(data => {
        this.scanned.push(data)
        this.running--
      })
      .catch(err => {
        console.error(`There was a problem getting peer height from http://${node.ip}:4003`)
        this.running--
      })
  }

  /**
   * [_getPeerList gets a list of peers the node is connected to]
   * @param  {[Object]} node
   * @return {[Array]} array of node objects
   */
  async _getPeerList (node) {
    try {
      const result = await axios.get(
        `http://${node.ip}:4003/api/peers`,
        {timeout: this.timeout}
      )
      return result.data.peers
    } catch (err) {
      throw err
    }
  }

  /**
   * [_getHeight get height of the node]
   * @param  {[Object]} node
   * @return {[Object]} object containing height and id of the block at the given height
   */
  async _getHeight (node) {
    try {
      const result = await axios.get(
        `http://${node.ip}:4003/api/blocks/getHeight`,
        {timeout: this.timeout}
      )
      return {id: result.data.id, height: result.data.height}
    } catch (err) {
      throw err
    }
  }

}
