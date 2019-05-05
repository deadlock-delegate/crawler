const Crawler = require('./src/crawler')
const { URL } = require('url')
const { orderBy } = require('lodash/collection')

const crawler = new Crawler()
const args = process.argv.slice(2)

const report = (crawler) => {
  const blockStats = {}
  const versionStats = {}

  for (const item of crawler.heights) {
    if (blockStats[item.height]) {
      blockStats[item.height].count += 1
      blockStats[item.height].ids[item.id] += 1
    } else {
      blockStats[item.height] = {}
      blockStats[item.height].count = 1
      blockStats[item.height].height = item.height
      blockStats[item.height].ids = {}
      blockStats[item.height].ids[item.id] = 1
    }

    if (versionStats[item.version]) {
      versionStats[item.version].count += 1
    } else {
      versionStats[item.version] = {
        count: 1,
        version: item.version
      }
    }
  }

  const allDelays = crawler.heights.filter(item => item.delay).map(item => item.delay)
  const averageDelay = allDelays.reduce((a, b) => a + b, 0) / allDelays.length
  const maxDelay = Math.max(...allDelays)
  const minDelay = Math.min(...allDelays)

  console.log(`===========================================`)
  console.log(`Total nodes visited: ${Object.keys(crawler.nodes).length}`)
  console.log(`Total nodes online: ${crawler.heights.length}`)
  console.log(`------------------------------------------`)

  // height/block stats
  console.log(`Height and block stats:`)
  for (const stat of orderBy(Object.values(blockStats), ['height'], ['desc'])) {
    console.log(`  ${stat.count} nodes on height ${stat.height} with hashes:`)
    for (const hash in stat.ids) {
      console.log(`    - ${hash} (${stat.ids[hash]} nodes)`)
    }
  }

  // version stats
  console.log(``)
  console.log(`Version stats:`)
  for (const stat of orderBy(Object.values(versionStats), ['version'], ['desc'])) {
    console.log(`  - ${stat.count} nodes on version ${stat.version}`)
  }

  // delay stats
  console.log(``)
  console.log(`Delay`)
  console.log(`  Average delay: ${averageDelay}`)
  console.log(`  Min delay: ${minDelay}`)
  console.log(`  Max delay: ${maxDelay}`)

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
