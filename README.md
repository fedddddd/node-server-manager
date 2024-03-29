# node-server-manager
Server Manager for Plutonium Servers and probably all other Call of Duty dedicated servers
# Linux Install
Requirements
* nodejs (latest)
* npm
```bash
git clone https://github.com/fedddddd/node-server-manager.git
cd node-server-manager
npm install
chmod +x StartNSM.sh
./StartNSM.sh
```

# Windows Install
Requirements
* nodejs (latest)
* npm

Install both from [here](https://nodejs.org/en/)
```batch
// Clone the repository
cd node-server-manager
npm install
StartNSM.bat
```
# Configuration
| Paramter | Description |
| --- | --- |
| Enable webfront ( true / false ) | Whether you want to enable the webfront or not |
| Webfront bind port [0-65536] | Port the webfront will bind to |
| Enable webfront https (true / false) | Whether to enable ssl on the webfront |
| SSL Key file | Provide the path for the SSL key |
| SSL Certificate file | Provide a path for the SSL certificate |
| Webfront hostname | The url that will be used for the webfront (for example in the discord webhook plugin), must be like www.hostname.com |
| Discord WebHook url | ( Optional ) specify the discord webhook url if you want to enable it |
| MOTD | (Message of  the day) will show up at the bottom of every webfront page ( you can use xbbcode to format it and cod color codes (^1, ^2...) as well as placeholders |
| Server IP | IP Address of the server |
| Server Port | Port of the server |
| Server Rcon password | Password for the rcon (remote console) of the server |
| Server Log File path | Path of the server's logfile |
| Server Gamename | Server's gamename (ex IW3, T6, IW5...) |

Other optional parameters
| Paramter | Description |
| --- | --- |
| LOGSERVERURI | If your dedicated server is in a different vps / server you can use the log server for that (example url: ws://{ip}:{port}/&key={key}) |
| Info | Text that will be shown in the /info page of the webfront, can be formatted using xbbcode [example](http://patorjk.com/bbcode-previewer/) and cod color codes (^1, ^2,...) you can also add placeholders |
| Permissions | Contains configuration for levels, commands and roles |
| Levels | Contains role base names and their level |
| Commands | Contains permissions for all commands |
| Roles | Contains the role base names and their display names |
| autoMessages | Array containing all auto messages |
| autoMessagesInterval | Interval of auto messages |
| sessionDuration | Duration of each session (for in game login and other stuff) |
| commandPrefixes | Array containing command prefixes |
| broadcastCommandPrefixes | Array containing broadcast (tell everyone in the server) command prefixes |
| links | Array containing links that will be shown using the links command, example `{ "Name": "Discord", "Url": "discord.gg/whatever" }` |
| socialMedia | Similar to links but it will display the url or whatever you set it to by typing the command prefix followed by the name of the link (ex !discord), format is `[ "name", "url" ]` |

Text Placeholders
| Name | Description |
| --- | --- |
| {USERNAME} | Current logged in client's username (motd only) |
| {CLIENTID} | Current logged in client's ClientId (motd only) |
| {PLAYERCOUNT} | Online players count |
| {SERVERCOUNT} | Online servers count |
| {TOTALKILLS} | Total killed players (automessages only) |
| {TOTALPLAYEDTIME} | Total played time of players (automessages only) |
| {TOPSERVER-IP} | IP of the currently most populated server (info page only) |
| {TOPSERVER-PORT} | Port of the currently most populated server (info page only) |
| {TOPSERVER-HOSTNAME} | Hostname of the currently most populated server (info page only) |
| {TOPSERVER-PLAYERS} | Player count of the currently most populated server (info page only) |

# Commands

| Command | Alias | Permission | Description | Arguments |
| --- | --- | --- | --- | --- |
| help |  | User | Displays list of commands | |
| ping |  | User | Pings server | |
| broadcast |  | Admin | Broadcasts a message to all servers | | 
| tell |  | User | Send a private message to any user in any server | |
| players |  | User | Displays list of all players in all servers |  |
| info |  | User | Displays version and author | |
| whoami |  | User | Displays info about the user | |
| servers |  | User | Displays list of all servers | |
| stats |  | User | Displays stats about the specified user or self | @ClientId or Name (Optional) |
| token |  | User | Displays a 6 character token that can be used to log in the webfront | |
| rcon |  | Owner | Executes an rcon command | ServerId (if on command line), Command |
| tp |  | Admin | Teleports to specified user (Requires server-side script) | @ClientId or Name |
| tphere |  | Admin | Teleports user to self (Requires server-side script) | @ClientId or Name |
| setrole | sr | Admin | Sets a user's role | @ClientId or Name, Role |
| owner |  | User | Claims ownership of a server | | 
| kick |  | Moderator | Kicks a player | @ClientId or Name, Reason |
| unban | ub | Moderator | Unbans a player | @ClientId or Name, Reason |
| tempban | tb | Moderator | Temp bans a player | @ClientId or Name, Duration, Reason |
| ban | b | Moderator | Bans a player | @ClientId or Name, Reason |
| find | f | User | Displays all users matching that name | Name |
| locker |  | User | Displays and manages the locker | Slot (Optional) |
| buylocker |  | User | Buys an extra locker slot |

# Account Settings

| Setting | Description | Default |
| --- | --- | --- |
| Token Login | Whether to enable token login (login using the token from the token command in game) | Enabled |
| 2FA | Enable Two-Factor Authentication for the webfront | Disabled |
| In Game Login | If enabled you must authorize logins (through /authenticator in the webfront) before being able to execute any commands in game (sessions last based on config value and refresh at each connection) | Disabled |

# Plugins

Functionality can be extended using plugins. Plugins must be placed in the Plugins/ folder and must follow this structure:
```js
class Plugin {
  constructor(Server, Manager) {
    this.Server = Server
    this.Manager = Manager
    // do whatever...
    /* Add event listeners
      Server.on('connect', this.playerConnected.bind(this))
    */
  }
  playerConnected(Player) {
    // Player contains: ClientSlot, Name, IPAddress, etc... for more information see the Player structure Lib/Entity/ePlayer.js
    // Player events: kill (Victim, Attack), death (Attacker, Attack), message (Message)
    // Player methods: Tell, Ban, Kick, Tempban
    Player.Tell('Hello World')
  }
}

module.exports = Plugin
```
# Log Server
If your dedicated server is in a different vps / server from Node Server Manager you can use the log server to share the logfile
To do that create a json file named NLSConfiguration in Configuration/ and configure it:
```json
{
  "Servers": [
    {
      "bindPort" : 1337,
      "logFile" : "/home/whatever/pluto/storage/iw5/games_mp.log",
      "key" : "1337",
      "ssl" : {
        "cert" : "/etc/ssl/certs/certificate.crt",
        "key" : "/etc/ssl/private/private.key"
      }
    }
  ]
}
```
Then run StartLogServer.sh or simply run `node Lib/NodeLogServer.js`

| Parameters | Description |
| --- | --- |
| bindPort | Port the websocket will bind to |
| logFile | Path to the log file | 
| key | Key to protect the websocket |
| ssl | Should contain ssl `key` and `cert` files if possible |

In your manager configuration add (`ws` or `wss` if you have ssl enabled):
```json
"LOGSERVERURI" : "ws://ip:port/&key=key"
```
to the server

# Default Plugins
| Plugin | Description |
| --- | --- |
| AutoMessages | Prints welcome messages to players and random messages from the config |
| DiscordWebhook | Sends events (connections, disconnections, messages, penalties) to the discord webhook in the config |
| NativeCommands | Adds basic commands |
| Penalties | Manages all penalties |
| PlutoT6Rcon | Rcon settings for T6 |
| StatLogger | Logs player kills, death, playtime... |
| ZombiesBank | (requires server-side gsc script) Adds a bank system to zombies (you can withdraw, desposit and even transfer money to other players) |
| ZombiesStats | (requires server-side gsc script) Logs zombies stats and adds zstats command |
| MoreCommands | name says it |

# Zombies Bank
To make this plugin work simply add this gsc code to any gsc script:
```gsc

init() {
   	level thread onPlayerConnect();
   	setDvar("bank_withdraw", "");
  	setDvar("bank_deposit", "");
  	level thread playerBank();
}

onPlayerConnect()
{
	level endon( "end_game" );
   	self endon( "disconnect" );
	for (;;)
	{
		level waittill( "connected", player );
		player thread endPlayerMoney2();
		player thread endPlayerMoney(); // probably not necessary
		player thread setPlayerMoney();

	}
}

endPlayerMoney() {
	self endon("disconnect");
	for (;;) {
		level waittill("end_game");
		setDvar(self getEntityNumber() + "_money", 0);
	}
}

endPlayerMoney2() {
	self endon("disconnect");
	for (;;) {
		level waittill("_zombie_game_over");
		setDvar(self getEntityNumber() + "_money", 0);
	}
}


setPlayerMoney() {
	level endon("end_game");
	level endon("_zombie_game_over");
	self endon("disconnect");
	for (;;) {
		if (!isAlive(self)) {
			setDvar(self getEntityNumber() + "_money", 0);
		} else {
			setDvar(self getEntityNumber() + "_money", self.score);
		}
		wait 0.05;
	}
}

getPlayerByGuid(guid) {
    	for (i = 0; i < level.players.size; i++) {
        	if (isAlive(level.players[i]) && int(level.players[i] getGuid()) == int(guid)) {
            	return level.players[i];
        	} 
    	}
    	return false;
}

playerBank() {
	for (;;) {
		if (getDvar("bank_withdraw") != "") {
			withdraw = strTok(getDvar("bank_withdraw"), ";");
			setDvar("bank_withdraw", "");
			getPlayerByGuid(withdraw[0]).score += int(withdraw[1]);
			getPlayerByGuid(withdraw[0]) iPrintLn("Withdrew ^2$" + int(withdraw[1]) + "^7 from your bank account!");
		}
		if (getDvar("bank_deposit") != "") {
			deposit = strTok(getDvar("bank_deposit"), ";");
			setDvar("bank_deposit", "");
			getPlayerByGuid(deposit[0]).score -= int(deposit[1]);
			getPlayerByGuid(deposit[0]) iPrintLn("Deposited ^2$" + int(deposit[1]) + "^7 into your bank account!");
		}
		wait 0.05;
	}
}
```

# Discord Integration
To enable this simply create an app on the discord developer site, then to your configuration add
| Name | Description |
| --- | --- |
| discordSecret | What it says |
| discordClientId | ^ |
| discordOAuth2Url | A url that points to your webfront's discord callback (eg. https://webfront.com/api/discord/callback) |
| discordBotToken | What it says |
| discordSecret | ^ |

This will create a category named "NSM-Servers" on your discord server, then it will create a channel on that category for each server and stream the chat there.

Players who have connected their discord account will have their profile picture show up when they send a message on a server and will be able to send messages to the server's chat from the discord channel. 

In addition their profile picture and discord id (name#discriminator) will show up on their profile

# Script Commands
This plugin adds commands such as !kill, !give... to IW5

For this plugin to work you must also install this plugin on your IW5 Server:

https://github.com/fedddddd/iw5-chai-utils
