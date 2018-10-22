const Crawler = require('./src/crawler')
const { URL } = require('url')
const { forEach, keys } = require('lodash')

const crawler = new Crawler()
const args = process.argv.slice(2)

const report = (crawler) => {
  let blockStats = {}

  forEach(crawler.heights, (item) => {
    if (blockStats[item.height]) {
      blockStats[item.height].count += 1
      blockStats[item.height].ids[item.id] += 1
    } else {
      blockStats[item.height] = {}
      blockStats[item.height].count = 1
      blockStats[item.height].ids = {}
      blockStats[item.height].ids[item.id] = 1
    }
  })

  console.log(`===========================================`)
  console.log(`Total nodes visited: ${keys(crawler.nodes).length}`)
  console.log(`Total nodes online: ${crawler.heights.length}`)
  console.log(`------------------------------------------`)
  console.log(`Block stats:`)
  console.log(blockStats)
  console.log(`------------------------------------------`)
  console.log(`Finished scanning in ${new Date() - crawler.startTime}ms`)
  process.exit(0)
}

let node = {ip: '167.99.243.111', port: 4003}

if (args.length === 1) {
    const url = new URL(args[0])
    node.ip = url.hostname
    node.port = url.port
}

crawler.run(node).then(report)
