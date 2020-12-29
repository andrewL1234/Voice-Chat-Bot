const Discord = require('discord.js');

// /(cmd) to run
const botPrefix = "/";

// Create the bot
const client = new Discord.Client();

// List of commands, used in -help function(WHENEVER YOURE ADDING A NEW CMD, MAKE A NEW FIELD IN THIS)
const cmdDescriptions = {
	"/help": "Bot Help",
	"/hostValorant": "Hosts a Valorant lobby",
	"/hostValorantCustoms": "Hosts a Valorant custom lobby",
	"/hostCsgo": "Hosts a CSGO lobby",
	"/hostCsgoCustoms": "Hosts a CSGO custom lobby",
	"/hostAmongUs": "Hosts an Among Us lobby",
	"/hostMinecraft": "Hosts a Minecraft Lobby",

}

// Start up the bot
client.on('ready', () => {
	// Set bot status to: "Watching over lobbies"
	client.user.setActivity("over lobbies | /help", {
		type: 'WATCHING'
	})
	console.log("Epic bot is online");
});

let lobbies = {
	"valorant": [],
	"valorant customs": [],
	"csgo": [],
	"csgo customs": [],
	"among us": [],
	"minecraft": [],
}

let lobbyUserLimits = {
	"valorant": 5,
	"valorant customs": 10,
	"csgo": 5,
	"csgo customs": 10,
	"among us": 10,
	"minecraft": 10
}

let lobbyImageURLs = {
	"valorant": "https://www.pcgamesn.com/wp-content/uploads/2020/03/valorant-logo.jpg",
	"valorant customs": "https://www.pcgamesn.com/wp-content/uploads/2020/03/valorant-logo.jpg",
	"csgo": "https://seeklogo.com/images/C/csgo-logo-CAA0A4D48A-seeklogo.com.png",
	"csgo customs": "https://seeklogo.com/images/C/csgo-logo-CAA0A4D48A-seeklogo.com.png",
	"among us": "https://cdn-wp.thesportsrush.com/2020/09/Screenshot-128.png",
	"minecraft": "https://thumbs.dreamstime.com/b/minecraft-logo-online-game-dirt-block-illustrations-concept-design-isolated-186775550.jpg",
	
}


let discordNumberEmojiNames = [":one:", ":two:", ":three:", ":four:", ":five:", ":six:", ":seven:", ":eight:", ":nine:", ":keycap_ten:"]


//since more than 1 lobby can be running, store data in this object
class Lobby {
	constructor(type, message, members, lobbyNumber, voiceChannel, textChannel) {
		this.type = type
		this.message = message
		this.members = members
		this.lobbyNumber = lobbyNumber
		this.voiceChannel = voiceChannel
		this.textChannel = textChannel
	}

	isFull() {
		return this.members.length == lobbyUserLimits[this.type]
	}
}


function capitalizeFirstLetter(string) {
	let strArray = string.split(" ")

	for(word in strArray) {
		strArray[word] = strArray[word].charAt(0).toUpperCase() + strArray[word].slice(1)
	}

	return strArray.join(" ")
}

async function hostCommands(lobbyType, message) {
	if(findUserInLobbies(message.author.id)) {
		message.reply("You're in another lobby already")
		return
	}

	let currentLobbyNumber

	if (lobbies[lobbyType].length == 0) {
		//need a separate condition for empty lobby array
		currentLobbyNumber = 0
	} else {
		//find lobbynumber for this lobby and initialize the lobby
		lobbies[lobbyType].forEach((lobby, index) => {
			if(lobby.lobbyNumber == (index)) {
				if(index == (lobbies[lobbyType].length - 1)) {
					currentLobbyNumber = index + 1
				}
				return
			}

			currentLobbyNumber = index
		})
	}

	//insert lobby where a lobbynumber is skipped
	lobbies[lobbyType].splice(currentLobbyNumber, 0, new Lobby())
	lobbies[lobbyType][currentLobbyNumber].type = lobbyType
	lobbies[lobbyType][currentLobbyNumber].lobbyNumber = currentLobbyNumber

	let lobbyRosterString = `:one: <@${message.author.id}>(lobby leader)\n`
	for(let i = 1; i < lobbyUserLimits[lobbyType]; i++) {
		lobbyRosterString += `${discordNumberEmojiNames[i]} Empty\n`
	}

	let hostLobbyEmbed = new Discord.MessageEmbed()
		.setAuthor(`${message.author.username}`, message.author.displayAvatarURL())
		.setTitle(`**${capitalizeFirstLetter(lobbyType)} Lobby ${currentLobbyNumber + 1}**`)
		.addField("React with :white_check_mark: to join!", lobbyRosterString)
		.addField("React with :x: to leave the Lobby!", "\u200b")
		.addField("React with :thumbsup: to close the Lobby!", "\u200b")
		.setColor("#0x3df037")
		.setTimestamp(message.createdAt)
		.setFooter(`Brought to you by ${message.author.tag}`)
		.setThumbnail(lobbyImageURLs[lobbyType])

	//store embed in the message field of the correct lobby in array

	lobbies[lobbyType][currentLobbyNumber].message = await message.channel.send(`Here's your ${lobbyType} Lobby:\n`, hostLobbyEmbed)
	lobbies[lobbyType][currentLobbyNumber].members = [message.author.id]

	let parentChannel = message.guild.channels.cache.filter(channel => channel.name.toLowerCase() == lobbyType && channel.type == "category").first()

	if(!parentChannel) {
		parentChannel = await message.guild.channels.create(capitalizeFirstLetter(lobbyType), {
			type: "category"
		})
	}
	
	//create new role for this lobby
	await message.guild.roles.create({
		data: {
			name: `${lobbyType} lobby ${currentLobbyNumber+1}`,
		}
	}).then(async role => {
		message.member.roles.add(role)
		await message.guild.channels.create(`${lobbyType}-${currentLobbyNumber+1} voice`, {
			type: "voice",
			userLimit: lobbyUserLimits[lobbyType],
			permissionOverwrites: [
				{
					id: message.guild.roles.cache.find(role => role.name == "@everyone").id,
					deny: ["VIEW_CHANNEL"]
				},
				{
					id: role.id,
					allow: ["VIEW_CHANNEL", "CONNECT"]
				}
			]
		}).then(channel => {
			channel.setParent(parentChannel.id)
			lobbies[lobbyType][currentLobbyNumber].voiceChannel = channel
		})
		
		await message.guild.channels.create(`${lobbyType}-${currentLobbyNumber+1} text`, {
			type: "text",
			permissionOverwrites: [
				{
					id: message.guild.roles.cache.find(role => role.name == "@everyone").id,
					deny: ["VIEW_CHANNEL"]
				},
				{
					id: role.id,
					allow: ["VIEW_CHANNEL", "SEND_MESSAGES"]
				}
			]
		}).then(channel => {
			channel.setParent(parentChannel.id)
			lobbies[lobbyType][currentLobbyNumber].textChannel = channel
		})
	})


	//adds reactions to the embed
	await lobbies[lobbyType][currentLobbyNumber].message.react('✅')
	await lobbies[lobbyType][currentLobbyNumber].message.react('❌')
	await lobbies[lobbyType][currentLobbyNumber].message.react('👍')
}

// Message detection
client.on('message', async message => {
	// Don't do anything if the msg is sent by the bot
	if (message.author.bot) return;

	// Initialize variables
	let messageArray = message.content.split(" ");
	let args = messageArray.slice(1);
	let command = messageArray[0];

	if (!command.startsWith(botPrefix)) return;


	// Use a switch case function to detect commands more easily
	switch (command.slice(botPrefix.length)) {
		// Help command
		case "help":
			if (args.length > 0) {
				message.reply("correct usage: /help")
				break
			}
			let helpEmbed = new Discord.MessageEmbed()
				.setTitle("Bot Help")
				.setColor("#506773")
				.setFooter(`Requested by ${message.author.username}`, message.author.displayAvatarURL)

			// Loop through the list of commands on line 10
			for (item in Object.keys(cmdDescriptions)) {
				helpEmbed.addField(`**${Object.keys(cmdDescriptions)[item]}**`, `${Object.values(cmdDescriptions)[item]}`);
			}
			message.channel.send(helpEmbed);
			break;
			// Normal Valorant Cmd
		case "kick":
			//KICK COMMAND
		case "hostValorant":
			// Make sure they are using the correct format
			if (args.length > 0) {
				message.reply("correct usage: /hostValorant")
				break
			}
			
			hostCommands("valorant", message)


			break;
			// Valorant Customs command
		case "hostValorantCustoms":
			if (args > 0) {
				message.reply("correct usage: /hostValorantCustoms");
				break
			}
			hostCommands("valorant customs", message)

			break;

			// CSGO command
		case "hostCsgo":
			// Make sure they are using the correct format
			if (args > 0) {
				message.reply("correct usage: /hostCsgo");
				break
			}

			hostCommands("csgo", message)
			break;
			// CSGO customs command
		case "hostCsgoCustoms":
			if (args > 0) {
				message.reply("correct usage: /hostCsgoCustoms");
				break
			}
			hostCommands("csgo customs", message)
			break;
			// Among us command
		case "hostAmongUs":
			// Make sure they are using the correct format
			if (args > 0) {
				message.reply("correct usage: /hostAmongUs");
				break
			}
			hostCommands("among us", message)
			break;
			// Minecraft command
		case "hostMinecraft":
			if (args > 0) {
				message.reply("correct usage: /hostMinecraft");
				break
			}
			hostCommands("minecraft", message)
			break;
		default:
			return message.reply("I didn't understand the command");
	}
});

function createNewRoster(lobby, messageReacted, commandMessage) {
	//create a new roster that will be edited on the embed
	let newRoster = "";

	for(let i = 0; i < lobbyUserLimits[lobby.type]; i++) {
		newRoster += discordNumberEmojiNames[i]
		if(i < lobby.members.length) {
			newRoster += `<@${lobby.members[i]}>`
			if(i == 0) {
				newRoster += "(lobby leader)"
			}
			newRoster += "\n"
		} else{
			newRoster += "Empty\n"
		}
	}

	let editedEmbed = new Discord.MessageEmbed()
		.setAuthor(`${commandMessage.author.username}`, commandMessage.author.displayAvatarURL())
		.setTitle(`**${lobby.type} Lobby ${lobby.lobbyNumber + 1}**`)
		.addField("React with :white_check_mark: to join!", newRoster)
		.addField("React with :x: to leave the Lobby!", "\u200b")
		.addField("React with :thumbsup: to close the Lobby!", "\u200b")
		.setColor("#0x3df037")
		.setTimestamp(messageReacted.createdAt)
		.setFooter(`Brought to you by ${commandMessage.author.tag}`)
		.setThumbnail(lobbyImageURLs[lobby.type])

	return editedEmbed
}

function findUserInLobbies(userID) {
	for (lobbyType in lobbies) {
		for (lobby in lobbies[lobbyType]) {
			if(lobbies[lobbyType][lobby].members.includes(userID)) {
				return `${lobbyType} ${lobby}`
			}
		}
	}
	return undefined
}


client.on("messageReactionAdd", function (messageReaction, user) {
	//exit if the bot reacted to message
	if (user.bot) {
		return;
	}

	const messageReacted = messageReaction.message

	//bot has to have sent the embed, if it wasn't bot just exit
	if (!messageReacted.author.bot) {
		return;
	}

	//yep this is a thing
	if(messageReacted.content == "this lobby has been deleted!") return;


	const channel = client.channels.cache.get(messageReacted.channel.id)
	//get last 100 messages from channel(100 is max)
	channel.messages.fetch({
		limit: 100
	}).then(messages => {
		//convert the messages collection into array for easier indexing
		const messagesArray = messages.array()

		//this fetch creates an array of messages in channel, most recent is in first index
		messagesArray.forEach((element, index) => {
			if (element.id === messageReacted.id) {
				//check if the message before reacted message contains /host, means that they reacted to a lobby embed
				if (messagesArray[index + 1].content.startsWith("/host")) {
					let commandMessage = messagesArray[index + 1]
					let lobbyType

					Object.keys(lobbies).forEach(lobby => {
						if (lobby.split(" ").join("") == commandMessage.content.slice(5).toLowerCase()) {
							lobbyType = lobby
						}
					})

					switch (messageReaction.emoji.name) {
						case '✅':
							console.log("WHAT")
							//find which lobby this is
							lobbies[lobbyType].forEach(async lobby => {
								if(lobby.message.id == messageReacted.id) {
									if (!lobby.isFull() && !lobby.members.includes(user.id)) {

										//CHECK IF USER IS IN OTHER LOBBY
										if(findUserInLobbies(user.id)) {
											return
										}

										//check if lobby already includes the user that reacted
										lobby.members.push(user.id)

										//give the user the role
										let role = messageReacted.guild.roles.cache.find(r => r.name == `${lobbyType} lobby ${lobby.lobbyNumber + 1}`)
										
										let userToAddRole = await messageReacted.guild.members.fetch(user.id)
										
										userToAddRole.roles.add(role)

										messageReacted.edit(createNewRoster(lobby, messageReacted, commandMessage))
									}
								}
							})

							//delete reaction
							messageReacted.reactions.resolve('✅').users.remove(user.id)
							break;
						case '❌':
							lobbies[lobbyType].forEach(async (lobby,index) => {
								if(lobby.message.id == messageReacted.id) {
									if (lobby.members.includes(user.id)) {
										lobby.members.splice(lobby.members.indexOf(user.id), 1)

										//remove the user's role
										let role = messageReacted.guild.roles.cache.find(r => r.name == `${lobbyType} lobby ${lobby.lobbyNumber + 1}`)
										//messageReacted.guild.members.fetch(user.id).roles.remove(role)
										let userToDeleteRole = await messageReacted.guild.members.fetch(user.id)
										
										userToDeleteRole.roles.remove(role)

										//delete the lobby if there are no members left
										if (lobby.members.length == 0) {
											let deletedEmbed = new Discord.MessageEmbed()
												.setTitle("Lobby Deleted!")
											messageReacted.edit("This lobby has been deleted!", deletedEmbed)
											
											lobbies[lobbyType][index].voiceChannel.delete()
											lobbies[lobbyType][index].textChannel.delete()

											lobbies[lobbyType].splice(index, 1)

											//delete the role that corresponds to this lobby
											role.delete()

											
										} else {
											messageReacted.edit(createNewRoster(lobby, messageReacted, commandMessage))
										}
									}
								}
							})

							//delete reaction
							messageReacted.reactions.resolve('❌').users.remove(user.id)
							break;
						case '👍':							
							lobbies[lobbyType].forEach((lobby, index) => {
								if(lobby.message.id == messageReacted.id) {
									//user that wants to close to lobby must be in the lobby alr
									if(lobby.members.includes(user.id) && lobby.members.indexOf(user.id) == 0) {
										let deletedEmbed = new Discord.MessageEmbed()
											.setTitle("Lobby Deleted!")
										messageReacted.edit("This lobby has been deleted!", deletedEmbed)
										
										lobbies[lobbyType][index].voiceChannel.delete()
										lobbies[lobbyType][index].textChannel.delete()
										
										lobbies[lobbyType].splice(index, 1)

										//delete role for this lobby
										let role = messageReacted.guild.roles.cache.find(r => r.name == `${lobbyType} lobby ${lobby.lobbyNumber + 1}`)
										role.delete()
									} else {
										messageReacted.reactions.resolve('👍').users.remove(user.id)
									}
									
								}
							})
							break;
					}
				}
			}
		})
	})


});

// Copy and paste the bot token between the quotes
client.login(process.env.BOT_TOKEN);