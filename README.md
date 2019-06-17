# Crawler

Crawler scans the ARK network to get information about the peers in the network.

**Branches**
- master: is for Ark v2.4 node and higher which **uses websockets** for p2p instead of api
- v2.3: is for any Ark node that's lower than v2.4 which **does not use websockets** yet

## Installation

`npm install`

## Usage

`npm start http://<ip>:<port>`

For port use the p2p port, which is 4001 for Ark's mainnet or 4002 for Ark's devnet.

## Credits

- [roks0n](https://github.com/roks0n)
- [dmvt](https://github.com/dmvt)
- [All Contributors](../../../../contributors)

## License

[MIT](LICENSE) © roks0n
