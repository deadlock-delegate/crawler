const Crawler = require('./src/crawler')
const { URL } = require('url')

const crawler = new Crawler()
const args = process.argv.slice(2)

const report = (crawler) => {
  const blockStats = {}

  for (const item of crawler.heights) {
    if (blockStats[item.height]) {
      blockStats[item.height].count += 1
      blockStats[item.height].ids[item.id] += 1
    } else {
      blockStats[item.height] = {}
      blockStats[item.height].count = 1
      blockStats[item.height].ids = {}
      blockStats[item.height].ids[item.id] = 1
    }
  }

  console.log(`===========================================`)
  console.log(`Total nodes visited: ${Object.keys(crawler.nodes).length}`)
  console.log(`Total nodes online: ${crawler.heights.length}`)
  console.log(`------------------------------------------`)
  console.log(`Block stats:`)
  for (const stat in blockStats) {
    console.log(`${blockStats[stat].count} nodes on height ${stat} with hashes:`)
    for (const hash in blockStats[stat].ids) {
      console.log(`  - ${hash} (${blockStats[stat].ids[hash]} nodes)`)
    }
  }
  console.log(`------------------------------------------`)
  console.log(`Finished scanning in ${new Date() - crawler.startTime}ms`)

  process.exit(0)
}

let node = { ip: undefined, port: undefined }
if (args.length === 1) {
  const url = new URL(args[0])
  node.ip = url.hostname
  node.port = url.port
}

crawler.run(node).then(report)
