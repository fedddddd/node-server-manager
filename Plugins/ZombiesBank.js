const Sequelize         = require('sequelize')
const path              = require('path')
const Utils             = new (require(path.join(__dirname, '../Utils/Utils.js')))()
const Permissions       = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`)).Permissions
const Localization      = require(path.join(__dirname, `../Configuration/Localization-${process.env.LOCALE}.json`)).lookup

const maxGameMoney = 1000000

class Plugin {
    constructor(Server, Manager, Managers) {
        this.Server = Server
        this.Manager = Manager
        this.Managers = Managers
        this.Server.on('connect', this.onPlayerConnect.bind(this))
        this.Server.on('line', this.onLine.bind(this))
        this.init()
    }
    async onLine(line) {
        line = line.trim().replace(new RegExp(/([0-9]+:[0-9]+)\s+/g), '')

        if (Utils.isJson(line)) {
            var bankAction = JSON.parse(line)
            switch (bankAction.event) {
                case 'bank_withdraw':
                    var Player = this.Server.Clients.find(Client => Client && Client.Guid == bankAction.player.Guid)
                    Player && (await this.addPlayerMoney(Player.ClientId, -1 * bankAction.amount))
                break
                case 'bank_deposit':
                    var Player = this.Server.Clients.find(Client => Client && Client.Guid == bankAction.player.Guid)
                    Player && (await this.addPlayerMoney(Player.ClientId, bankAction.amount))
                break
            }
        }
    }
    async updatePlayerBalance() {
        this.Server.Clients.forEach(Client => {
            if (!Client || !Client.bankActionQueue.length) return

            this.addPlayerMoney(Client.ClientId, Utils.arraySum(Client.bankActionQueue))
        })
    }
    async onPlayerConnect(Player) {
        if (!(await this.getZMStats(Player.ClientId))) {
            await this.Server.DB.Models.NSMZombiesStats.build({
                ClientId: Player.ClientId
            }).save()
        }

        Player.bankActonQueue = []
        this.setBalanceDvar(Player)
    }
    async createTable() {
        this.Server.DB.Models.NSMZombiesStats = this.Server.DB.Models.DB.define('NSMZombiesStats', 
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
            Money: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
                allowNull: false
            },
            LockerWeapon: {
                type: Sequelize.TEXT,
                defaultValue: 'none',
                allowNull: false
            }   
        }, {
            timestamps: false
        })
        this.Server.DB.Models.NSMZombiesStats.sync()
    }
    async getZMStats(ClientId) {
        if (ClientId == 1) {
            return {
                Money: Infinity,
                LockerWeapon: 'none'
            }
        }

        var ZMStats = await this.Server.DB.Models.NSMZombiesStats.findAll({
            where: {
                ClientId: ClientId
            }
        })
        return ZMStats.length > 0 ?ZMStats[0].dataValues : false
    }
    async setPlayerMoney(ClientId, Money) {
        await this.Server.DB.Models.NSMZombiesStats.update({
            Money : Money }, {
                where: {ClientId: ClientId
            }
        })
    }
    async setBalanceDvar(Player) {
        if (!Player.Server) return
        Player.Server.Rcon.setDvar(`${Player.Guid}_balance`, (await this.getZMStats(Player.ClientId)).Money)
    }
    async addPlayerMoney(ClientId, Money) {
        return await this.Server.DB.Models.NSMZombiesStats.update({ 
            Money : Sequelize.literal(`Money + ${Money}`) }, {
                where: {ClientId: ClientId
                }
            })
    }
    async init () {
        await this.createTable()

        this.Manager.commands['withdraw'] = {
            ArgumentLength: 1,
            Alias: 'w',
            logToAudit: false,
            Permission: Permissions.Commands.COMMAND_USER_CMDS,
            callback: async (Player, args) => {
                if (!this.Server.isZM()) {
                    Player.Tell(Localization['COMMAND_UNAVAILABLE_GAMETYPE'])
                    return
                }

                if (Player.Data && Player.Data.lastWithdraw && (new Date() - Player.Data.lastWithdraw) / 1000 < 5) {
                    Player.Tell(Localization['COMMAND_COOLDOWN'])
                    return
                }

                var totalMoney = (await this.getZMStats(Player.ClientId)).Money
                var gameMoney = parseInt(await Player.Server.Rcon.getDvar(`${Player.Clientslot}_money`))
                const canUseBank = await Player.Server.Rcon.getDvar(`${Player.Clientslot}_can_use_bank`)
                if (canUseBank == "0") {
                    Player.Tell(Localization['ZBANK_DISABLED']);
                    return
                }

                var withdrawMoney = args[1].toLocaleLowerCase() == 'all' 
                    ? Math.min(parseInt(totalMoney), maxGameMoney - gameMoney) 
                    : Math.min(parseInt(args[1]), maxGameMoney - gameMoney)
            
                switch (true) {
                    case (!Number.isInteger(withdrawMoney) || withdrawMoney < 0):
                        Player.Tell(Localization['ZBANK_PARSE_ERROR'])
                    return
                    case (totalMoney < withdrawMoney):
                        Player.Tell(Localization['ZBANK_BALANCE_ERROR']);
                    return
                }
                var result = await Player.Server.Rcon.executeCommandAsync(`set bank_withdraw ${Player.Guid};${withdrawMoney}`)

                if (result) {
                    Player.Tell(Utils.formatString(Localization['ZBANK_WITHDRAW_SUCCESS'], {
                        amount: withdrawMoney.toLocaleString()
                    }, '%')[0])

                    Player.Data.lastWithdraw = new Date()
                    this.setPlayerMoney(Player.ClientId, parseInt(totalMoney) - parseInt(withdrawMoney))

                    return
                }

                Player.Tell(Localization['ZBANK_WITHDRAW_FAIL'])
            }
        }
        this.Manager.commands['deposit'] = {
            ArgumentLength: 1,
            Alias: 'd',
            logToAudit: false,
            Permission: Permissions.Commands.COMMAND_USER_CMDS,
            callback: async (Player, args) => {
                if (!this.Server.isZM()) {
                    Player.Tell(Localization['COMMAND_UNAVAILABLE_GAMETYPE'])
                    return
                }

                if (Player.Data && (new Date() - Player.Data.lastDeposit) / 1000 < 5) {
                    Player.Tell(Localization['COMMAND_COOLDOWN'])
                    return
                }

                var totalMoney = (await this.getZMStats(Player.ClientId)).Money
                var gameMoney = parseInt(await Player.Server.Rcon.getDvar(`${Player.Clientslot}_money`))
                var depositMoney = args[1] == 'all' ? parseInt(gameMoney) : parseInt(args[1])

                const canUseBank = await Player.Server.Rcon.getDvar(`${Player.Clientslot}_can_use_bank`)
                if (canUseBank == "0") {
                    Player.Tell(Localization['ZBANK_DISABLED']);
                    return
                }

                switch (true) {
                    case (!Number.isInteger(depositMoney)):
                        Player.Tell(Localization['ZBANK_PARSE_ERROR'])
                    return
                    case (depositMoney <= 0):
                    case (!gameMoney || !Number.isInteger(gameMoney) || gameMoney < depositMoney):
                        Player.Tell(Localization['ZBANK_BALANCE_ERROR'])
                    return
                }

                var result = await Player.Server.Rcon.executeCommandAsync(`set bank_deposit ${Player.Guid};${depositMoney}`)

                if (result) {
                    Player.Tell(Utils.formatString(Localization['ZBANK_DEPOSIT_SUCCESS'], {
                        amount: depositMoney.toLocaleString()
                    }, '%')[0])

                    Player.Data.lastDeposit = new Date()
                    this.setPlayerMoney(Player.ClientId, parseInt(totalMoney) + parseInt(depositMoney))

                    return
                }

                Player.Tell(Localization['ZBANK_DEPOSIT_FAIL'])
            }
        }
        this.Manager.commands['pay'] = {
            ArgumentLength: 2,
            inGame: false,
            logToAudit: false,
            Permission: Permissions.Commands.COMMAND_USER_CMDS,
            callback: async (Player, args) => {
                var Target = await this.Server.getClient(args[1])

                if (!Target) {
                    Player.Tell(Localization['COMMAND_CLIENT_NOT_FOUND'])
                    return
                }

                var totalMoney = (await this.getZMStats(Player.ClientId)).Money
                var moneyToGive = parseInt(args[2])

                switch (true) {
                    case (!Number.isInteger(moneyToGive) || moneyToGive < 0):
                        Player.Tell(Localization['ZBANK_PARSE_ERROR'])
                    return
                    case (!totalMoney):
                    case (totalMoney < parseInt(moneyToGive * 1.05) && Player.Guid != 'Node'):
                        Player.Tell(Localization['ZBANK_BALANCE_ERROR'])
                    return
                }

                await this.addPlayerMoney(Player.ClientId, -1 * parseInt(parseInt(moneyToGive) * 1.05))
                this.addPlayerMoney(Target.ClientId, parseInt(moneyToGive))

                Player.Tell(Utils.formatString(Localization['ZBANK_TRANSFER_FORMAT'], {
                    amount: moneyToGive.toLocaleString(), 
                    name: Target.Name, 
                    fee: parseInt(moneyToGive * 0.05), 
                    id: Utils.getRandomInt(10000000, 90000000)
                }, '%')[0])

                Target.inGame = Utils.findClient(Target.ClientId, this.Managers)

                Target.inGame && Target.inGame.Tell(Utils.formatString(Localization['ZBANK_RECEIVE_FORMAT'], {
                    amount: moneyToGive.toLocaleString(), 
                    name: Player.Name
                }, '%')[0])
            }
        }
        this.Manager.commands['setmoney'] = {
            ArgumentLength: 2,
            inGame: false,
            logToAudit: false,
            Permission: Permissions.Commands.COMMAND_RCON,
            callback: async (Player, args) => {
                var Target = await this.Server.getClient(args[1])

                if (!Target) {
                    Player.Tell(Localization['COMMAND_CLIENT_NOT_FOUND'])
                    return
                }

                const moneyToSet = parseInt(args[2])

                if (!Number.isInteger(moneyToSet)) {
                    Player.Tell(Localization['ZBANK_PARSE_ERROR'])
                    return
                }

                await this.setPlayerMoney(Target.ClientId, moneyToSet)

                Player.Tell(Utils.formatString(Localization['ZBANK_SETMONEY_FORMAT'], {
                    amount: moneyToSet.toLocaleString(), 
                    name: Target.Name
                }, '%')[0])

                Target.inGame = Utils.findClient(Target.ClientId, this.Managers)
                Target.inGame && Target.inGame.Tell(Utils.formatString(Localization['ZBANK_NEWBALANCE_FORMAT'], {
                    amount: moneyToSet.toLocaleString()
                }, '%')[0])
            }
        }
        this.Manager.commands['money'] = {
            ArgumentLength: 0,
            inGame: false,
            Alias: 'balance',
            logToAudit: false,
            Permission: Permissions.Commands.COMMAND_USER_CMDS,
            callback: async (Player, args) => {
                if (args[1]) {
                    const Client = await this.Server.getClient(args[1])

                    if (!Client) {
                        Player.Tell(Localization['COMMAND_CLIENT_NOT_FOUND'])
                        return
                    }

                    const amount = (await this.getZMStats(Client.ClientId)).Money
                        
                    if (amount == undefined) {
                        Player.Tell(Localization['ZBANK_PLAYER_NO_ACCOUNT'])
                        return
                    }

                    Player.Tell(Utils.formatString(Localization['ZBANK_MONEY_FORMAT'], {
                        name: Client.Name, 
                        amount: amount.toLocaleString()
                    }, '%')[0])
                    return
                }

                const amount = (await this.getZMStats(Player.ClientId)).Money

                if (amount == undefined) {
                    Player.Tell(Localization['ZBANK_NO_ACCOUNT'])
                    return
                }

                Player.Tell(Utils.formatString(Localization['ZBANK_MONEY_FORMAT_SELF'], {
                    amount: amount.toLocaleString()
                }, '%')[0])
            }
        }
    }
}

module.exports = Plugin