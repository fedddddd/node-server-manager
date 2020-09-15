const Sequelize         = require('sequelize')
const path              = require('path')
const Models            = require(path.join(__dirname, `../Lib/DatabaseModels.js`))
const Permissions = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`)).Permissions
const Localization = require(path.join(__dirname, `../Configuration/Localization.json`)).lookup
const Utils             = new (require(path.join(__dirname, '../Utils/Utils.js')))()
const wait              = require('delay')

class Plugin {
    constructor (Server, Manager, Managers) {
        this.Server = Server
        this.Manager = Manager
        this.Managers = Managers
        this.Server.on('connect', this.onPlayerConnect.bind(this))
        this.zStats()
        this.webfront()
    }
    async onPlayerConnect(Player) {
        if ((await this.getZStats(Player.ClientId))) return
        await this.NSMZStats.build({
            ClientId: Player.ClientId
        }).save()
      }
    async createTable() {
        this.Manager.on('webfront-ready', (Webfront) => {
            Webfront.addHeaderHtml(`<a href='/zstats' class='wf-header-link'><i class="fas fa-skull"></i></a>`, 3)
        })
        this.NSMZStats = Models.DB.define('NSMZStats', 
        {
            ClientId: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                allowNull: false,
                primaryKey: true,
                references: {
                    model: 'NSMClients',
                    key: 'ClientId'
                }
            },
            Kills: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
                allowNull: false
            },
            Score: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
                allowNull: false
            },
            Downs: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
                allowNull: false
            },
            Revives: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
                allowNull: false
            },
            Headshots: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
                allowNull: false
            },
            HighestRound: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
                allowNull: false
            },
  
        }, {
            timestamps: false
        })
        this.NSMZStats.sync()
    }
    async getTopStats(page, limit) {
        var Stats = (await this.NSMZStats.findAll({
            limit: limit,
            offset: page * limit,
            attributes: ['ClientId', 'Kills', 'Downs', 'Revives', 'HighestRound', 'Headshots', 'Score', [Sequelize.literal('ROW_NUMBER() over (order by Score desc)'), 'Rank']],
            order: [
                ['Score', 'desc']
            ]
        })).map(x => x = x.dataValues)
        for (var i = 0; i < Stats.length; i++) {
            Stats[i].Name = await this.Server.DB.getName(Stats[i].ClientId)
        }
        return Stats
    }
    async webfront() {
        this.Manager.on('webfront-ready', (Webfront) => {
            Webfront.addHeaderHtml(`<a href='/zstats' class='wf-header-link'><i class="fas fa-skull"></i></a>`, 3)

        })
    }
    async updateStats(Client, Stats, Round = 0) {
        Object.entries(Stats).forEach(Stat => {
            if (!Client.previousStats) return
            if (Stat[1] < Client.previousStats[Stat[0]]) {
                Client.previousStats = {
                    Kills: 0,
                    Revives: 0,
                    Downs: 0,
                    Score: 0,
                    Headshots: 0,
                    HighestRound: 0,
                }
            }
        })
        if (!Client.previousStats) {
            Client.previousStats = {
                Kills: Stats.Kills,
                Revives: Stats.Revives,
                Downs: Stats.Downs,
                Score: Stats.Score,
                Headshots: Stats.Headshots,
                HighestRound: Round
            }
            return
        }
        var newStats = {
            Kills: Stats.Kills - Client.previousStats.Kills,
            Revives: Stats.Revives - Client.previousStats.Revives,
            Downs: Stats.Downs - Client.previousStats.Downs,
            Score: Stats.Score - Client.previousStats.Score,
            Headshots: Stats.Headshots - Client.previousStats.Headshots,
            HighestRound: Round
        }
        Client.previousStats = {
            Kills: Stats.Kills,
            Revives: Stats.Revives,
            Downs: Stats.Downs,
            Score: Stats.Score,
            Headshots: Stats.Headshots,
            HighestRound: Round
        }
        this.NSMZStats.update({
            Kills: Sequelize.literal(`Kills + ${newStats.Kills}`),
            Downs: Sequelize.literal(`Downs + ${newStats.Downs}`),
            Revives: Sequelize.literal(`Revives + ${newStats.Revives}`),
            Score: Sequelize.literal(`Score + ${newStats.Score}`),
            Headshots: Sequelize.literal(`Headshots + ${newStats.Headshots}`)
        },
        {where: {ClientId: Client.ClientId}})
        if (Round) {
            this.NSMZStats.update({
                HighestRound: Round,
            }, { where: {
                ClientId: Client.ClientId,
                HighestRound: {
                    [Sequelize.Op.lt]: Round
                }
            }})
        }
    }
    async getZStats(ClientId) {
        var Stats = (await this.NSMZStats.findAll({where: ClientId})).map(x => x = x.dataValues)
        return Stats.length > 0 ? Stats[0] : false
    }
    async zStats() {
        await this.createTable()
        this.Manager.commands['zstats'] = {
            ArgumentLength: 0,
            inGame: false,
            logToAudit: false,
            Permission: Permissions.Commands.COMMAND_USER_CMDS,
            callback: async (Player, args) => {
                if (args[1]) {
                    var Client = await this.Server.getClient(args[1])
                    if (!Client) {
                        var Stats = this.getZStats(Player.ClientId)
                        if (!Stats) {
                            Player.Tell(Localization['STATS_NOT_EXIST'])
                            return
                        }
                        Stats.Player = Player.Name
                        var formattedStats = Utils.formatString(Localization['COMMAND_ZSTATS_FORMAT'], Stats, '%');
                        formattedStats.forEach(async line => {
                            Player.Tell(line)
                            await wait(100)
                        })
                        return
                    }
                    var Stats = await this.getZStats(Client.ClientId)
                    if (!Stats) {
                        Player.Tell(Localization['STATS_NOT_EXIST'])
                        return
                    }
                    Stats.Player = Client.Name
                    var formattedStats = Utils.formatString(Localization['COMMAND_ZSTATS_FORMAT'], Stats, '%');
                    formattedStats.forEach(async line => {
                        Player.Tell(line)
                        await wait(100)
                    })
                } else {
                    var Stats = await this.getZStats(Player.ClientId)
                    if (!Stats) {
                        Player.Tell(Localization['STATS_NOT_EXIST'])
                        return
                    }
                    Stats.Player = Player.Name
                    var formattedStats = Utils.formatString(Localization['COMMAND_ZSTATS_FORMAT'], Stats, '%');
                    formattedStats.forEach(async line => {
                        await Player.Tell(line)
                        await wait(100)
                    })
                }
    
            }
        }
        this.Server.on('connect', async (Client) => {
            Client.previousStats = null
            Client.on('round_start', async (Round, Stats) => {
                await this.updateStats(Client, Stats, Round)
            })
            Client.on('update_stats', async (Round, Stats) => {
                await this.updateStats(Client, Stats, Round)
            })
        })
        this.Server.on('line', async (data) => {
            data = data.trim().replace(new RegExp(/([0-9]+:[0-9]+)\s+/g), '')
            if (this.isJson(data) && JSON.parse(data).event) {
                var event = JSON.parse(data)
                switch (event.event) {
                    case 'round_start':
                        event.players.forEach(Player => {
                            this.Server.Clients.forEach(async Client => {
                                if (!Client) return
                                if (Client.Guid == Player.Guid) {
                                    Client.emit('round_start', event.round, Player.Stats)
                                }
                            })
                        })
                    break
                    case 'player_downed':
                    case 'player_revived':
                    case 'update_stats':
                        this.Server.Clients.forEach(async Client => {
                            if (!Client) return
                            if (Client.Guid == event.player.Guid) {
                                Client.emit('update_stats', null, event.player.Stats)
                            }
                        })
                    break
                }
            }
        })
    }
    isJson(data) {
        try {
            JSON.parse(data)
        }
        catch (e) {
            return false
        }
        return true
    }
}

module.exports = Plugin