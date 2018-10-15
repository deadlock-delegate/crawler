const Crawler = require('./src/crawler')

const crawler = new Crawler()
const args = process.argv.slice(2)

let node = {ip: '167.99.243.111', port: 4003}
if (args.length === 1) {
    const url = new URL(args[0])
    node.ip = url.hostname
    node.port = url.port
}
crawler.run(node)
