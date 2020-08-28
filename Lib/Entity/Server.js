const ePlayer         = require('./ePlayer.js')
const fs              = require('fs')
const EventEmitter    = require('events')
const ip              = require('public-ip')

class _Server extends EventEmitter {
    constructor(IP, PORT, RCON, DATABASE) {
      super()
      this.Clients = new Array(18).fill(null)
      this.Rcon = RCON
      this.IP = IP
      this.PORT = PORT
      this.clientHistory = []
      this.clientActivity = []
      this.DB = DATABASE
      this.MaxClients = 18
      this.Mapname = null
      this.HostnameRaw = `[${this.IP}:${this.PORT}]`
      this.uptime = 0
      this.previousUptime = 0
      this.previousStatus = null
      this.setMaxListeners(18)
      this.Heartbeat();
      this.HeartbeatInt = setInterval(this.Heartbeat.bind(this), 15000)
    }
    COD2BashColor(string) {
        return string.replace(new RegExp(/\^([0-9]|\:|\;)/g, 'g'), `\x1b[3$1m`)
    }
    async setDvarsAsync() {
      try {
        // Set hostname
        this.Hostname = this.COD2BashColor(await this.Rcon.getDvar(this.Rcon.commandPrefixes.Dvars.hostname))

        this.HostnameRaw = await this.Rcon.getDvar(this.Rcon.commandPrefixes.Dvars.hostname)
        // Set mapname
        this.Mapname = await this.Rcon.getDvar(this.Rcon.commandPrefixes.Dvars.mapname)

        this.MaxClients = await this.Rcon.getDvar(this.Rcon.commandPrefixes.Dvars.maxclients)

        this.externalIP = !this.IP.match(/(^127\.)|(localhost)|(^192\.168\.)|(^10\.)|(^172\.1[6-9]\.)|(^172\.2[0-9]\.)|(^172\.3[0-1]\.)|(^::1$)|(^[fF][cCdD])/g) ? this.IP : await ip.v4()
      }
      catch (e) {}
    }
    async Heartbeat() {
      try {
        var status = await this.Rcon.executeCommandAsync(this.Rcon.commandPrefixes.Rcon.status)
        if (!status) {
          this.Rcon.isRunning = false
          console.log(`${this.IP}:${this.PORT} is not responding`)
        }
        if (!this.Rcon.isRunning && status != false) {
          this.Rcon.isRunning = true
          console.log(`${this.IP}:${this.PORT} is responding again, reloading clients...`)
          setTimeout( async () => {
            await this.loadClientsAsync()
            this.emit('reload')
          }, 10000)
        }
        this.setDvarsAsync();
      }
      catch (e) {}
    }
    async loadClientsAsync() {
      var status = await this.Rcon.getStatus();
      if (!status) return
      for (var i = 0; i < this.Clients.length; i++) {
        if (!this.Clients[i]) continue
        this.Clients[i].removeAllListeners()
        this.Clients[i] = null
      }
      status.data.clients.forEach(async c => {
        if (this.Clients[c.num]) this.Clients[c.num].removeAllListeners()
        this.Clients[c.num] = new ePlayer(c.guid, c.name, c.num, c.address, this);
        await this.Clients[c.num].build()
        this.emit('connect', this.Clients[c.num])
      })
    }
    Broadcast (string) {
      this.Clients.forEach(c => {
        if (c == null) return
        c.Tell(string);
      });
    }
  }
module.exports = _Server