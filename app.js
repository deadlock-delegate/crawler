const Crawler = require('./src/crawler')
const { URL } = require('url')
const { orderBy } = require('lodash/collection')

const crawler = new Crawler()
const args = process.argv.slice(2)

const report = (crawler) => {
  const blockStats = {}
  const versionStats = {}

  const nodes = Object.values(crawler.nodes)

  for (const item of nodes) {
    if (item.height === undefined || item.id === undefined) {
      continue
    }

    if (blockStats[item.height]) {
      blockStats[item.height].count += 1
      blockStats[item.height].ids[item.id] += 1
    } else {
      blockStats[item.height] = {}
      blockStats[item.height].count = 1
      blockStats[item.height].height = item.height
      // todo block ids
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

  console.log('===========================================')
  console.log(`All nodes: ${Object.keys(crawler.nodes).length}`)
  console.log(`Nodes online: ${crawler.heights.length}`)
  console.log(`Nodes offline: ${Object.keys(crawler.nodes).length - crawler.heights.length}`)

  // height/block stats
  console.log('')
  console.log('Height and block stats:')
  for (const stat of orderBy(Object.values(blockStats), ['height'], ['desc'])) {
    console.log(`  ${stat.height} with ${stat.count} nodes. Block hashes:`)
    for (const hash in stat.ids) {
      console.log(`    - ${hash} (${stat.ids[hash]} nodes)`)
    }
  }

  // version stats
  console.log('')
  console.log('Version stats:')
  for (const stat of orderBy(Object.values(versionStats), ['version'], ['desc'])) {
    console.log(`  - ${stat.version} on ${stat.count} nodes`)
  }

  console.log('------------------------------------------')
  console.log(`Finished scanning in ${new Date() - crawler.startTime}ms`)

  process.exit(0)
}

const node = { ip: undefined, port: undefined }
if (args.length >= 1) {
  const url = new URL(args[0])
  node.ip = url.hostname
  node.port = url.port
}

crawler.run(node).then(report).catch(err => console.error(err))
