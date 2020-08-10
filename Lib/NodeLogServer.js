const configuration = require(path.join(__dirname, `../Configuration/NLSConfiguration.json`).toString())
const ws            = require('ws')
const fs            = require('fs')
const https         = require('https')
const http          = require('http')

class NodeLogServer {
    constructor(config) {
        this.logFile = config.logFile
        this.bindPort = config.bindPort
        try {
            this.ssl = {
                key: fs.readFileSync(config.ssl.key),
                cert: fs.readFileSync(config.ssl.cert)
            }
        } catch (e) {
            this.ssl = null
            console.log('Unable to load SSL certificate from configuration, starting server without SSL is not recommended provide a valid certificate if possible') 
        }

        this.key = config.key
    }
    init() {
        try {
            const server = this.ssl ? https.createServer(this.ssl) : http.createServer()
            const socket = new ws.Server({ server })

            server.listen(this.bindPort)

            console.log(`Server listening on port ${this.bindPort}`)

            var getParams = (url) => {
                var queryDict = {}
                url.substr(1).split("&").forEach(function(item) {queryDict[item.split("=")[0]] = item.split("=")[1]})
                return queryDict;
            }

            fs.watch(this.logFile, async (event, filename) => {
                if (!filename) return

                var lastLine = await readLastLines.read(this.logfile, 1)
                var currentMD5 = md5(await readLastLines.read(this.logfile, 4))
              
                if (!event || this.previousMD5 == currentMD5) return;
              
                this.previousMD5 = currentMD5;
    
                socket.Broadcast(lastLine)
            })

            socket.Broadcast = (msg) => {
                socket.authorizedClients.forEach(client => {
                    client.send(msg)
                })
            }
            socket.authorizedClients = []
            socket.on('connection', (conn, req) => {
                var params = getParams(req.url.substr(1))

                if (params.key != this.key) {
                    conn.close(403)
                    return
                }
                socket.authorizedClients.push(conn)
            })
        }
        catch (e) {
            console.log(`Log server failed to start: ${e.toString()}`)
        }
    }
}