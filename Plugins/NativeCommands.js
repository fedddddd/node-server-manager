const moment = require('moment')
const path = require('path')
const crypto = require('crypto')
const wait = require('delay')
const Permissions = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`)).Permissions
const _utils            = require(path.join(__dirname, '../Utils/Utils.js'))
const Utils             = new _utils();

class Plugin {
  constructor(Server, Manager, Managers) {
    this.Server = Server
    this.Manager = Manager
    this.Managers = Managers
    this.init()
  }
  getRoleFrom (Value, Type) {
    switch (Type) {
      case 0:
        var RolesArray = Object.entries(Permissions.Roles)
        for (var i = 0; i < RolesArray.length; i++) {
          if (RolesArray[i][1].toLocaleLowerCase() == Value.toLocaleLowerCase()) {
            return {
              Name: RolesArray[i][1],
              Level: Permissions.Levels[RolesArray[i][0]]
            }
          }
        }
      break;
      case 1:
        var RolesArray = Object.entries(Permissions.Levels)
        for (var i = 0; i < RolesArray.length; i++) {
          if (RolesArray[i][1] == Value) {
            return {
              Name: Permissions.Roles[RolesArray[i][0]],
              Level: RolesArray[i][1]
            }
          }
        }
      break;
    }
    return false
  }
  onEventAsync (event) {
    switch (event.type) {
        case 'say':
          if (event.data.Message.startsWith('.')) this.playerCommand(event.data.Origin, event.data.Message.substr(1).split(/\s+/))
        break;
    }
  }
  init () {
    this.lookup = {
      'COMMAND_NOT_FOUND' : 'Command not found, type ^3#help^7 for a list of commands',
      'COMMAND_ARGUMENT_ERROR' : 'Not enough arguments supplied',
      'COMMAND_CLIENT_NOT_FOUND' : 'Player not found',
      'COMMAND_CLIENT_NOT_INGAME' : 'Player is not in game',
      'ROLE_HIERARCHY_ERROR' : 'You can\'t set that role',
      'CLIENT_HIERARCHY_ERROR': 'You cannot execute this on that client',
      'COMMAND_EXECUTE_SUCCESS' : 'Command executed successfully',
      'ROLE_SELF_ERROR' : 'You can\'t set your own role',
      'COMMAND_STATS_FORMAT' : '[ ^5%NAME% ^7] => ^5%KILLS%^7 Kills | ^5%DEATHS% ^7Deaths | ^5%KDR% ^7KDR | ^5%PERFORMANCE%^7 Performance | ^7Play time ^5%PLAYEDTIME%',
      'COMMAND_FORBIDDEN' : 'You don\'t have enough permissions for this',
      'ROLE_NOT_EXIST' : 'Specified role doesn\'t exist',
      'COMMAND_HELP': 'Display the list of commands',
      'COMMAND_PING': 'Pings the server',
      'COMMAND_TP' : 'Teleport to player',
      'COMMAND_TPHERE' : 'Teleport player to you',
      'COMMAND_SETROLE' : 'Set player\'s role',
      'COMMAND_RCON' : 'Execute rcon commands',
      'COMMAND_STATS': 'Returns your stats',
      'COMMAND_OWNER': 'Claim ownership of a server',
      'COMMAND_KICK': 'Kick a player, usage: kick <ClientId>',
      'COMMAND_FIND': 'Find a players\'s ID',
      'COMMAND_INFO': 'Get NSM info',
      'COMMAND_TOKEN_FORMAT': 'Your login token is %TOKEN%, valid for 2 minutes, your ClientID is ^2%CLIENTID%^7 { ^5numbers^7, ^3letters^7 }',
      'COMMAND_PARSE_TIME_ERROR': 'Could not parse time, format: 1d (day), 2h (hours), 3m (mins), 10s (secs)',
      'RCON_SERVER_NOT_SPECIFIED': 'Please specify the server to execute this command on',
      'SERVER_NOT_EXIST': 'Specified server doesn\'t exist or is offline, Usage: rcon serverid command'
    }
    this.Manager.commands = {
      'help': {
        ArgumentLength: 0,
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        inGame: false,
        callback: async (Player, args = null, delay) => {
          var commandsArray = Object.entries(this.Manager.commands);
          for (var i = 0; i < commandsArray.length; i++) {
            Player.Tell(`^7[^6${commandsArray[i][0]}^7] ${this.lookup[`COMMAND_${commandsArray[i][0].toLocaleUpperCase()}`]}`)
            delay && await wait(500)
          }
        }
      },
      'ping': {
        ArgumentLength: 0,
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        inGame: false,
        callback: function (Player) {
          Player.Tell('pong')
        }
      },
      'broadcast': {
        ArgumentLength: 1,
        Permission: Permissions.Commands.COMMAND_BROADCAST,
        inGame: false,
        callback: async (Player, args) => {
          this.Managers.forEach(Manager => {
            Manager.Server.Broadcast(`^7[^1Broadcast ^7(^5${Player.Name}^7)] ${args.slice(1).join(' ')}`)
          })
        }
      },
      'tell': {
        ArgumentLength: 2,
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        inGame: false,
        callback: async (Player, args = null, delay) => {
          var Client = await this.Server.DB.getClient(parseInt(args[1]))
          switch (true) {
            case (!Client):
              Player.Tell(this.lookup.COMMAND_CLIENT_NOT_FOUND)
            return
          }
          var Target = this.findClient(Client.ClientId)
          switch (true) {
            case (!Target):
              Player.Tell(this.lookup.COMMAND_CLIENT_NOT_INGAME)
            return
          }

          Target.Tell(`^3[^5${Player.Name}^3 (#^5${Player.ClientId}^3) -> me]^7 ${args[2]}`)
          Player.Tell(`^3[me -> ^5${Target.Name} ^3(#^5${Target.ClientId}^3)^3]^7 ${args[2]}`)
        }
      },
      'players': {
        ArgumentLength: 0,
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        inGame: false,
        callback: async (Player, args = null, delay) => {
          var Managers = this.Managers.concat()
          Player.Tell(`Player list:`)
          for (var j = 0; j < Managers.length; j++) {
            var Manager = Managers[j]
            var Clients = Utils.chunkArray(Manager.Server.Clients.filter((value) => {return value}), 4)
            for (var i = 0; i < Clients.length; i++) {
              var line = []
              for (var o = 0; o < Clients[i].length; o++) {
                line.push(`^7[^6${Utils.getRoleFrom(Clients[i][o].PermissionLevel, 1).Name}^7 (#^5${Clients[i][o].ClientId}^7)] ^5${Clients[i][o].Name}^7`)
              }
              Player.Tell(line.join(' '))
              delay && await wait(500)
            }
          }
        }
      },
      'info': {
        ArgumentLength: 0,
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        inGame: false,
        callback: (Player) => {
          Player.Tell(`Node Server Manager - v${this.Manager.Version} by ${this.Manager.Author}`)
        }
      },
      'whoami': {
        ArgumentLength: 0,
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        inGame: false,
        callback: async (Player) => {
          var info = await this.Server.DB.getClient(Player.ClientId)
          Player.Tell(`[^5${info.Name}^7]  [#^5${info.ClientId}^7]  [^5${this.getRoleFrom(Math.min(info.PermissionLevel, 5), 1).Name}^7] [^5${info.IPAddress}^7] [^5${info.Guid}^7]`)
        }
      },
      'servers': {
        ArgumentLength: 0,
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        inGame: false,
        callback: async (Player, args, delay) => {
          var Managers = this.Managers.concat()
          if (args[1] && Managers[parseInt(args[1])] && Managers[parseInt(args[1])].Server.Mapname) {
            var Manager = Managers[parseInt(args[1])]
            Player.Tell(`[${Manager.Server.HostnameRaw}]^7 - ^3${Manager.Server.IP}:^5${Manager.Server.PORT}^7 - ^5${Manager.Server.Clients.filter((value) => {return value}).length}^7 players online on ^5${Manager.Server.Mapname}`)
            return
          }
          for (var i = 0; i < Managers.length; i++) {
            var Manager = Managers[i]
            if (!Manager.Server.Mapname) continue
            Player.Tell(`[^5${i}^7] - [${Manager.Server.HostnameRaw}]^7 - ^3${Manager.Server.IP}:^5${Manager.Server.PORT}^7 - ^5${Manager.Server.Clients.filter((value) => {return value}).length}^7 players online on ^5${Manager.Server.Mapname}`)
            delay && await wait(500)
          }
        }
      },
      'stats': {
        ArgumentLength: 0,
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        inGame: false,
        callback: async (Player, args) => {
          var ClientId = !args[1] ? Player.ClientId : args[1]
          var Stats = await this.Server.DB.getPlayerStatsTotal(ClientId)
          var OtherStats = await this.Server.DB.getPlayerStats(ClientId)
          if (Stats)
            Player.Tell(this.lookup.COMMAND_STATS_FORMAT
            .replace('%PLAYEDTIME%', this.timeConvert(Stats.PlayedTime))
            .replace('%PERFORMANCE%', Stats.Performance.toFixed(2))
            .replace('%NAME%', OtherStats.Player.Name)
            .replace('%KILLS%', Stats.Kills)
            .replace('%DEATHS%', Stats.Deaths)
            .replace('%KDR%',(Stats.Kills / Math.max(Stats.Deaths, 1)).toFixed(2)))
          else Player.Tell(this.lookup.COMMAND_CLIENT_NOT_FOUND)
        }
      },
      'token': {
        ArgumentLength: 0,
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        inGame: false,
        callback: async (Player) => {
          var rawToken = crypto.randomBytes(3).toString('hex').toLocaleUpperCase();
          rawToken = rawToken.split('')
          var formattedToken = []
          rawToken.forEach(char => {
            if (Number.isInteger(parseInt(char))) {
              formattedToken.push(`^5${char}^7`)
            } else {
              formattedToken.push(`^3${char}^7`)
            }
          })
          Player.Tell(this.lookup.COMMAND_TOKEN_FORMAT
            .replace('%CLIENTID%', Player.ClientId)
            .replace('%TOKEN%', formattedToken.join('')))
          await this.Server.DB.createToken(Player.ClientId, rawToken.join(''))
        }
      },
      'rcon': {
        ArgumentLength: 1,
        Permission: Permissions.Commands.COMMAND_RCON,
        inGame: false,
        callback: async (Player, args, delay) => {
          var result = []
          if (!Player.inGame) {
            switch (true) {
              case (args.length < 2):
                Player.Tell(this.lookup.RCON_SERVER_NOT_SPECIFIED)
              return
              case (!this.Managers[parseInt(args[1])] || !this.Managers[parseInt(args[1])].Server.Mapname || !this.Managers[parseInt(args[1])].Server.Rcon.isRunning):
                Player.Tell(this.lookup.SERVER_NOT_EXIST)
              return
            }
            result = (await this.Managers[parseInt(args[1])].Server.Rcon.executeCommandAsync(args.slice(2).join(' '))).trim().split('\n')
          } else {
            result = (await this.Server.Rcon.executeCommandAsync(args.slice(1).join(' '))).trim().split('\n')
          }
          result[0] = this.lookup.COMMAND_EXECUTE_SUCCESS
          for (var i = 0; i < result.length; i++) {
            Player.Tell(result[i])
            delay && await wait(300)
          }
        }
      },
      'tp': {
        ArgumentLength: 1,
        Permission: Permissions.Commands.COMMAND_TP,
        inGame: true,
        callback: async (Player, args) => {
          var Client = await this.Server.DB.getClient(args[1])
          var Target = await this.Server.Rcon.getClientByName(Client.Name)
          switch (true) {
            case !Client:
            case !Target:
              Player.Tell(this.lookup.COMMAND_CLIENT_NOT_FOUND)
            return;
          }
          await this.Server.Rcon.executeCommandAsync(`seta tp_src ${Player.Clientslot}`)
          await this.Server.Rcon.executeCommandAsync(`seta tp_dest ${Target.Clientslot}`)
          Player.Tell(`Teleporting you to ${Target.Name}`)
        }
      },
      'tphere': {
        ArgumentLength: 1,
        Permission: Permissions.Commands.COMMAND_TP,
        inGame: true,
        callback: async (Player, args) => {
          var Client = await this.Server.DB.getClient(args[1])
          var Target = await this.Server.Rcon.getClientByName(Client.Name)
          switch (true) {
            case !Client:
            case !Target:
              Player.Tell(this.lookup.COMMAND_CLIENT_NOT_FOUND)
            return;
          }
          await this.Server.Rcon.executeCommandAsync(`seta tp_src ${Target.Clientslot}`)
          await this.Server.Rcon.executeCommandAsync(`seta tp_dest ${Player.Clientslot}`)
          Player.Tell(`Teleporting ${Target.Name} to you`)
        }
      },
      'setrole': {
        ArgumentLength: 2,
        Permission: Permissions.Commands.COMMAND_SETROLE,
        inGame: false,
        Alias: 'sr',
        callback: async (Player, args) => {
            var Role = args.slice(2).join(' ')
            var Client = await this.Server.DB.getClient(args[1]);
            
            var Permission = this.getRoleFrom(Role, 0)
            switch (true) {
              case (!Client):
                Player.Tell(this.lookup.COMMAND_CLIENT_NOT_FOUND)
                return;
              case (!Permission):
                Player.Tell(this.lookup.ROLE_NOT_EXIST)
                return;
              case (Permission.Level > Player.PermissionLevel || Permission.Level >= Permissions.Levels.ROLE_OWNER):
                Player.Tell(this.lookup.ROLE_HIERARCHY_ERROR)
                return;
              case (Player.ClientId == Client.ClientId):
                Player.Tell(this.lookup.ROLE_SELF_ERROR)
                return;
            }
            var Target = this.findClient(Client.ClientId)
            if (Target) {
              Target.PermissionLevel = Permission.Level
              Target.Tell(`Your role has been set to [ ^5${Permission.Name}^7 ]`)
            }
            this.Server.DB.setLevel(Client, Permission.Level)
            Player.Tell(`^5${Client.Name}^7's role has been set to [ ^5${Permission.Name}^7 ]`)
        }
      },
      'owner': {
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        inGame: true,
        callback: async (Player) => {
          var Owner = await this.Server.DB.getOwner()
          console.log(Owner)
          switch (true) {
            case !Owner:
              this.Server.DB.setLevel(Player, 5)
              Player.Tell(`Your role has been set to [ ^5${this.getRoleFrom(5, 1).Name}^7 ]`)
              return
            case (Owner.ClientId == Player.ClientId):
              Player.Tell(`You're already the owner!`)
              return;
            case (Owner.ClientId != Player.ClientId):
              Player.Tell(`${this.Server.DB.getClient(Owner.ClientId).Name} owns this server`)
              return;
          }
        }
      },
      'kick': {
        ArgumentLength: 2,
        Alias: 'k',
        Permission: Permissions.Commands.COMMAND_KICK,
        inGame: false,
        callback: async (Player, args) => {
          var Client = await this.Server.DB.getClient(args[1])

          switch (true) {
            case (!Client):
              Player.Tell(this.lookup.COMMAND_CLIENT_NOT_FOUND)
            return
            case (Client.Permission >= Player.PermissionLevel):
              Player.Tell(this.lookup.CLIENT_HIERARCHY_ERROR)
            return
          }
          var Target = this.findClient(Client.ClientId)
          Target ? ( Player.Tell(`^5${Target.Name}^7 was kicked`), Target.Kick(`You have been kicked: ^5${args.slice(2).join(' ')}`, Player.ClientId)) : Player.Tell(this.lookup.COMMAND_CLIENT_NOT_INGAME)
        }
      },
      'unban': {
        ArgumentLength: 2,
        Alias: 'ub',
        Permission: Permissions.Commands.COMMAND_KICK,
        inGame: false,
        callback: async (Player, args) => {
          var Client = await this.Server.DB.getClient(args[1])
          var Reason = args.slice(2).join(' ')

          switch (true) {
            case (Client.Permission >= Player.PermissionLevel):
              Player.Tell(this.lookup.CLIENT_HIERARCHY_ERROR)
            return
          }

          var count = await this.Server.DB.unbanClient(Client.ClientId, Reason, Player.ClientId)

          count > 0 ? Player.Tell(`Unbanned ^5${Client.Name}^7 for ^5${Reason}^7`) : Player.Tell(`^5${Client.Name}^7 is not banned`)
        }
      },
      'tempban': {
        ArgumentLength: 3,
        Alias: 'tb',
        Permission: Permissions.Commands.COMMAND_BAN,
        inGame: false,
        callback: async (Player, args) => {

          var timeVars = {
            'd': 86400,
            'h': 3600,
            'm': 60,
            's': 1,
          }

          var Client = await this.Server.DB.getClient(args[1])

          var parts = Array.from(args[2].match(/([0-9]+)([A-Za-z]+)/)).slice(1)

          switch (true) {
            case (!Client):
              Player.Tell(this.lookup.COMMAND_CLIENT_NOT_FOUND)
            return
            case (Client.Permission >= Player.PermissionLevel):
              Player.Tell(this.lookup.CLIENT_HIERARCHY_ERROR)
            return
            case (!parts || parts.length < 2 || !timeVars[parts[1]] || !Number.isInteger(parseInt(parts[0]))):
              Player.Tell(this.lookup.COMMAND_PARSE_TIME_ERROR)
            return
          }

          var Reason = args.slice(3).join(' ')
          var Duration = parseInt(parts[0] * timeVars[parts[1]])
          var Target = this.findClient(Client.ClientId)
          if (Target) {
            Target.Tempban(Reason, Player.ClientId, Duration)
            Player.Tell(`Banned ^5${Client.Name}^7 for ^5${Duration}^7 seconds for ^5${Reason}^7`)
            return
          }


          this.Server.DB.addPenalty({
            TargetId: args[1],
            OriginId: Player.ClientId,
            PenaltyType: 'PENALTY_TEMP_BAN',
            Duration: Duration,
            Reason: Reason
          })
          Player.Tell(`Banned ^5${Client.Name}^7 for ^5${Duration}^7 seconds for ^5${Reason}^7`)
        }
      },
      'ban': {
        ArgumentLength: 2,
        Alias: 'b',
        Permission: Permissions.Commands.COMMAND_BAN,
        inGame: false,
        callback: async (Player, args) => {
          var Client = await this.Server.DB.getClient(args[1])

          switch (true) {
            case (!Client):
              Player.Tell(this.lookup.COMMAND_CLIENT_NOT_FOUND)
              return
            case (Client.Permission >= Player.PermissionLevel):
              Player.Tell(this.lookup.CLIENT_HIERARCHY_ERROR)
            return
          }

          var Reason = args.slice(2).join(' ')

          var Target = this.findClient(Client.ClientId)
          if (Target) {
            Target.Ban(Reason, Player.ClientId)
            Player.Tell(`Banned ${Target.Name} permanently for ${Reason}`)
            return
          }



          this.Server.DB.addPenalty({
            TargetId: args[1],
            OriginId: Player.ClientId,
            PenaltyType: 'PENALTY_PERMA_BAN',
            Duration: 0,
            Reason: Reason
          })

          Player.Tell(`Banned ${Client.Name} permanently for ${Reason}`)
        }
      },
      'find': {
        ArgumentLength: 1,
        Alias: 'f',
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        inGame: false,
        callback: async (Player, args, delay) => {
           var MatchedClients = await this.Server.DB.getClientByName(args.slice(1).join(' '))
           if (MatchedClients.length <= 0) {Player.Tell(`Client not found`); return}
           for (var i = 0; i < MatchedClients.length; i++) {
            Player.Tell(`^5${MatchedClients[i].Name} ^7| ^5@${MatchedClients[i].ClientId} ^7| ^5${this.getRoleFrom(MatchedClients[i].PermissionLevel, 1).Name} ^7| Active ${moment(MatchedClients[i].LastConnection).calendar()} | Joined ${moment(MatchedClients[i].FirstConnection).calendar()}`)
            delay && await wait(300)
           }
        }
      }
    };
      this.Server.on('event', this.onEventAsync.bind(this));
  }
  findClient(ClientId) {
    var Client = null
    this.Managers.forEach(Manager => {
      if (Client) return
      Client = Manager.Server.Clients.find(x => x && x.ClientId == ClientId)
    })
    return Client
  } 
  playerCommand (Player, args) {
      var command = Utils.getCommand(this.Manager.commands, args[0])
      switch (true) {
        case (!this.Manager.commands[command]):
          Player.Tell(this.lookup.COMMAND_NOT_FOUND)
          return;
        case (Player.PermissionLevel < Permissions.Levels[this.Manager.commands[command].Permission]):
          Player.Tell(this.lookup.COMMAND_FORBIDDEN)
          return;
        case (args.length - 1 < this.Manager.commands[command].ArgumentLength):
          Player.Tell(this.lookup.COMMAND_ARGUMENT_ERROR)
          return;
      }
      this.Manager.commands[command].callback(Player, args, true)
  }
  timeConvert (n) {
    var num = n;
    var hours = (num / 60);
    var rhours = Math.floor(hours);
    var minutes = (hours - rhours) * 60;
    var rminutes = Math.round(minutes);
    return `${rhours}:${rminutes}`
  }
}
module.exports = Plugin