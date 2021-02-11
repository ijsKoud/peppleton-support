import { Listener } from "discord-akairo";
import {
	Message,
	TextChannel,
	Collection,
	MessageAttachment,
	User,
	MessageReaction,
	MessageEmbed,
	Guild,
} from "discord.js";
import { appendFile } from "fs/promises";
import {
	anyDepChannel,
	categoryId,
	DispatchReports,
	DrivingReports,
	dsDepChannel,
	dsEmoji,
	eventNotification,
	QOTDNotifications,
	QOTDChannel,
	eventsChannel,
	gdDepChannel,
	gdEmoji,
	guardReports,
	guildId,
	mRole,
	otherReports,
	prefix,
	prEmoji,
	qdDepChannel,
	qdEmoji,
	suggestionsChannel,
	svRole,
} from "../../client/config";
import blacklist from "../../models/blacklist";
import ticket from "../../models/ticket";

const map = new Map<string, string>();
export default class ready extends Listener {
	constructor() {
		super("message", {
			emitter: "client",
			event: "message",
			category: "client",
		});
	}

	async exec(message: Message): Promise<void> {
		if (message.system || message.author.bot) return;
		if (message.mentions.has(this.client.user) && message.content.startsWith("<@"))
			return this.createTicket(message);
		if (message.content.includes("[PING]")) return this.ping(message);

		switch (message.channel.type) {
			case "dm":
				let channelId: string;
				if (map.has(message.author.id)) channelId = map.get(message.author.id);
				if (message.content.startsWith(prefix)) return;
				const schema = await ticket.findOne({ userId: message.author.id });
				if (!schema) return;

				channelId = channelId || (schema.get("channelId") as string);
				const channel = await this.getChannel(channelId);
				if (!channel) return;

				const files = this.getAttachments(message.attachments);
				channel.send(
					`>>> 💬 | Reply from **${message.author.username}**: \`\`\`${this.filter(
						message.content || "No message content."
					)}\`\`\`\n❓ | Use \`${prefix}message <message>\` to respond. Check the command list for all the commands available for tickets!`,
					{ files }
				);
				message.react("✅");

				this.transcript(message, message.author.id);
				map.set(message.author.id, channelId);
				setTimeout(() => map.delete(message.author.id), 5e3);
				this.updateLastMSG(message.author.id);
				break;
			case "text":
				if (
					!message.channel.name.endsWith("-ticket") ||
					!message.channel.topic.includes(message.author.id)
				)
					return;
				let userId: string;
				if (map.has(message.channel.id)) userId = map.get(message.channel.id);

				const scheme = await ticket.findOne({ channelId: message.channel.id });
				if (!scheme) return;
				userId = userId || (scheme.get("userId") as string);

				this.transcript(message, userId);
				if (!message.content.startsWith(prefix + "message")) return;

				const user = await this.getUser(userId);
				if (!user) return;

				const attachments = this.getAttachments(message.attachments);
				user
					.send(
						`>>> 💬 | Reply from **${
							message.member.nickname || message.author.username
						}**: \`\`\`${this.filter(
							message.content.slice((prefix + "message").length) || "No message content."
						)}\`\`\`\n❓ | Want to close this ticket? Ask **${
							message.member.nickname || message.author.username
						}** to close it for you.`,
						{ files: attachments }
					)
					.catch((e) => {
						this.client.log(`⚠ | Unexpected error: \`${e}\``);
						return message.react("❌");
					});
				message.react("✅");

				map.set(message.channel.id, userId);
				setTimeout(() => map.delete(message.channel.id), 5e3);
				this.updateLastMSG(userId);
				break;
			default:
				break;
		}
	}

	async transcript(message: Message, id: string): Promise<void | any> {
		await appendFile(
			`./src/transcriptions/${id}-ticket.txt`,
			`\n${message.author.tag}: ${message.content}`,
			"utf-8"
		).catch((e) => {
			return e;
		});
	}

	// ping system
	ping(message: Message) {
		switch (message.channel.id) {
			case eventsChannel:
				message.channel.send(`> <@&${eventNotification}>, new events notification 🔼`);
				break;
			case QOTDChannel:
				message.channel.send(`> <@&${QOTDNotifications}>, new QOTD notification 🔼`);
				break;
			default:
				break;
		}
	}

	// create ticket functions
	async createTicket(message: Message): Promise<any> {
		const guild = this.client.guilds.cache.get(guildId);
		if (!guild.available)
			return message.author.send(
				`> 🔥 | The server is on fire!!! Not literally but I can not contact it now, please try again later.`
			);

		try {
			const emojiFilter = (reaction: MessageReaction, user: User) => {
				return user.id === message.author.id && emojiNames.includes(reaction.emoji.name);
			};
			const filter = (m: Message) => {
				return m.author.id === message.author.id;
			};

			const selectorFilter = (reaction: MessageReaction, user: User) => {
				return user.id === message.author.id && ["1️⃣", "2️⃣", "3️⃣"].includes(reaction.emoji.name);
			};

			const member = guild.members.cache.get(message.author.id).partial
				? await guild.members.fetch(message.author.id)
				: guild.members.cache.get(message.author.id);
			const dmChannel = await member.createDM();
			let cancelled: boolean = false;
			let department: string = "";
			let title: string = "";
			let description: string = "";
			let extra: string = "";
			let fileUrls: string[] = [];

			let types: string[] = ["department", "title", "description", "extra"];
			let emojis: string[] = [qdEmoji, dsEmoji, gdEmoji, prEmoji];
			let emojiNames: string[] = ["PR_Driver", "PR_Dispatcher", "PR_Guard", "PR_Logo"];

			if (await blacklist.findOne({ id: message.author.id }))
				return dmChannel.send(
					`> 🔨 | You are blacklisted from using the tickets system, you can not open a ticket until you are removed from the blacklist. If you think this is a mistake feel free to DM a staff member about this.`
				);

			try {
				const embed = new MessageEmbed()
					.setAuthor(
						"Select one of the options to continue",
						this.client.user.displayAvatarURL({ dynamic: true, size: 4096 })
					)
					.setDescription("1️⃣ Open a ticket. \n 2️⃣ Make a suggestion.\n 3️⃣ Report a user.")
					.setFooter("This prompt will close in 60 seconds")
					.setColor("#061A29");
				const msg = await dmChannel.send(embed);
				["1️⃣", "2️⃣", "3️⃣"].forEach((emoji) => msg.react(emoji));

				const collector = await msg
					.awaitReactions(selectorFilter, {
						time: 6e4,
						max: 1,
						errors: ["time"],
					})
					.catch((e) => new Collection<string, MessageReaction>());
				if (!collector.size || !["1️⃣", "2️⃣", "3️⃣"].includes(collector.first().emoji.name))
					return msg.delete();

				if (collector.first().emoji.name === "2️⃣") {
					const sgMsg = await dmChannel.send(
						`> ❓ | What is your suggestion? Please give as much detail as possible.`
					);
					["1️⃣", "2️⃣"].forEach((emoji) => msg.react(emoji));

					const collector = await sgMsg.channel
						.awaitMessages(filter, { time: 12e4, max: 1, errors: ["time"] })
						.catch((e) => new Collection<string, Message>());
					if (!collector.size) return msg.edit("> ❌ | Prompt cancelled");

					const suggestions = (guild.channels.cache.get(suggestionsChannel) ||
						(await this.client.channels.fetch(suggestionsChannel, true))) as TextChannel;
					suggestions.send(
						`> ${prEmoji} | New suggestion - **${
							message.author.tag
						}**: \`\`\` ${collector.first().content.replace(/\`/g, "")} \`\`\``,
						{ split: true }
					);

					return dmChannel.send(
						`> ${prEmoji} | New suggestion - **${
							message.author.tag
						}**: \`\`\` ${collector
							.first()
							.content.replace(
								/\`/g,
								""
							)} \`\`\` \n > ❗ | Misusing will result in a suggestion blacklist.`,
						{ split: true }
					);
				} else if (collector.first().emoji.name === "3️⃣") {
					return this.report(message);
				}
			} catch (e) {
				console.log(e);
				return message.channel.send(
					"> ⚠ | Oops, It looks like your DMs are not open. Enable them so I can send you a DM. \n > ℹ | If you think I am wrong, please ping **DaanGamesDG#7621** and he will help you."
				);
			}

			const schema = await ticket.findOne({ userId: message.author.id });
			if (schema) return;

			if (!this.client.tickets)
				return dmChannel.send(
					`> 🔒 | Sorry, the tickets are currently closed. Come back later to see if they are opened again.`
				);
			if (this.client.openTickets.has(message.author.id)) return message.react("❌");

			for await (const type of types) {
				if (cancelled) return;
				switch (type) {
					case "department":
						const embed = new MessageEmbed()
							.setAuthor(
								"Select a department to continue:",
								this.client.user.displayAvatarURL({ dynamic: true, size: 4096 })
							)
							.setColor("#061A29")
							.setDescription([
								"Is your question related to a **role**? \n If not, select `any department`! \n",
								`> ${qdEmoji} | **Driver Department**`,
								`> ${dsEmoji} | **Dispatch Department**`,
								`> ${gdEmoji} | **Guard Department**`,
								`> ${prEmoji} | **Any Department** \n`,
								"React to an emoji below to continue. \n This prompt will close in `60` seconds!",
							]);

						const depMsg = await dmChannel.send(embed);
						for (const emoji of emojis) depMsg.react(emoji);
						const depCollector = await depMsg
							.awaitReactions(emojiFilter, {
								time: 6e4,
								max: 1,
								errors: ["time"],
							})
							.catch((e) => new Collection<string, MessageReaction>());
						if (!depCollector.size) {
							cancelled = true;
							depMsg.delete();
							return dmChannel.send(`> ❌ | The prompt is cancelled.`);
						}

						switch (depCollector.first().emoji.name) {
							case emojiNames[0]:
								department = "Driver Department";
								depMsg.delete();
								dmChannel.send(`> ${qdEmoji} | You selected the **${department}**.`);
								break;
							case emojiNames[1]:
								department = "Dispatch Department";
								depMsg.delete();
								dmChannel.send(`> ${dsEmoji} | You selected the **${department}**.`);
								break;
							case emojiNames[2]:
								department = "Guard Department";
								depMsg.delete();
								dmChannel.send(`> ${gdEmoji} | You selected the **${department}**.`);
								break;
							case emojiNames[3]:
								department = "Any Department";
								depMsg.delete();
								dmChannel.send(`> ${prEmoji} | You selected the **${department}**.`);
								break;
						}
						break;
					case "title":
						const titleMsg = await dmChannel.send(
							`> 📝 | What is the title/topic of your question? You do not have to describe your question here, you can do that in the next part.`
						);
						const titleCollector = await dmChannel
							.awaitMessages(filter, { time: 6e4, max: 1, errors: ["time"] })
							.catch((e) => new Collection<string, Message>());
						if (!titleCollector.size) {
							cancelled = true;
							return titleMsg.edit(`> ❌ | The prompt is cancelled.`);
						}
						title = titleCollector.first().content;
						titleMsg.edit(
							`> 📁 | You answered: \`${
								title.length > 1800 ? title.substr(0, 1800 - 3) + "..." : title
							}\`.`
						);
						break;
					case "description":
						const descMsg = await dmChannel.send(
							`> 📝 | Explain your question. In the next step you can add message attachements to support your description.`
						);
						const descCollector = await dmChannel
							.awaitMessages(filter, { time: 12e4, max: 1, errors: ["time"] })
							.catch((e) => new Collection<string, Message>());
						if (!descCollector.size) {
							cancelled = true;
							return descMsg.edit(`> ❌ | The prompt is cancelled.`);
						}
						description = descCollector.first().content;
						descMsg.edit(
							`> 📁 | You answered: \`${
								description.length > 1800 ? description.substr(0, 1800 - 3) + "..." : description
							}\`.`
						);
						break;
					case "extra":
						const extraMsg = await dmChannel.send(
							`> 📝 | Add any attachments here, if you don't have them just say something like: \`No attachments\`.`
						);
						const extraCollector = await dmChannel
							.awaitMessages(filter, { time: 6e4, max: 1, errors: ["time"] })
							.catch((e) => new Collection<string, Message>());
						if (!extraCollector.size) {
							cancelled = true;
							return extraMsg.edit(`> ❌ | The prompt is cancelled.`);
						}
						const files = this.getAttachments(extraCollector.first().attachments);
						extra = extraCollector.first().content;
						await dmChannel.send(
							`> 📁 | You answered: \`${
								extra.length > 1800 ? extra.substr(0, 1800 - 3) + "..." : extra
							}\`.`,
							{
								files,
							}
						);
						extra = extraCollector.first().content;
						fileUrls = files;
						break;
				}
			}

			title ? title : "Unkown Title";
			extra ? extra : "Unkown extra";
			description ? description : "Unkown Description";
			const embed = new MessageEmbed()
				.setTitle("Your ticket is created - support will be with you shortly!")
				.setDescription([
					`> ${prEmoji} | **Department**: ${department}`,
					`> 🏷 | **Title/topic**: ${title.length > 200 ? title.substr(0, 200 - 3) + "..." : title}`,
					`> 📄 | **Description**: ${
						description.length > 200 ? description.substr(0, 200 - 3) + "..." : description
					}`,
					`> 📂 | **Extra**: ${extra.length > 400 ? extra.substr(0, 400 - 3) + "..." : extra}`,
				])
				.addField(
					"Files",
					fileUrls
						.map((url) => url)
						.join(" ")
						.substr(0, 1024) || "No attachments"
				)
				.setColor("#061A29");
			dmChannel.send(embed);
			this.client.openTickets.set(message.author.id, true);

			return this.claimingSystem(message, guild, department, title, description, extra, fileUrls);
		} catch (e) {
			this.client.openTickets.delete(message.author.id);
			console.log(e);
			message.channel
				.send(`> ❗ | Oh no, this shouldn't happen: \n\`\`\`\n${e}\n\`\`\``)
				.catch((e) => null);
			return;
		}
	}

	async claimingSystem(
		message: Message,
		guild: Guild,
		dep: string,
		title: string,
		description: string,
		extra: string,
		files: string[]
	) {
		const filter = (reaction: MessageReaction, user: User) => {
			return !user.bot && ["✅"].includes(reaction.emoji.name);
		};

		const channelId =
			dep == "Driver Department"
				? qdDepChannel
				: dep == "Dispatch Department"
				? dsDepChannel
				: dep == "Guard Department"
				? gdDepChannel
				: anyDepChannel;
		const channel = guild.channels.cache.get(channelId) as TextChannel;
		if (!channel) return console.log("No ticket channel found for " + channelId);

		try {
			const embed = new MessageEmbed()
				.setTitle(`A new ticket is opened by ${message.author.tag}`)
				.setDescription([
					`> ${prEmoji} | **Department**: ${dep}`,
					`> 🏷 | **Title/topic**: ${title.length > 200 ? title.substr(0, 200 - 3) + "..." : title}`,
					`> 📄 | **Description**: ${
						description.length > 200 ? description.substr(0, 200 - 3) + "..." : description
					}`,
					`> 📂 | **Extra**: ${extra.length > 400 ? extra.substr(0, 400 - 3) + "..." : extra}`,
					`> 👤 | **User**: ${message.author.toString()}`,
				])
				.addField(
					"Files",
					files
						.map((url) => url)
						.join(" ")
						.substr(0, 1024) || "No attachments"
				)
				.setColor("#061A29")
				.setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 4096 }));
			const msg = await channel.send(embed);
			msg.react("✅");

			const collector = await msg
				.awaitReactions(filter, { time: 864e5, max: 1, errors: ["time"] })
				.catch((e) => new Collection<string, MessageReaction>());
			if (!collector.size)
				return (
					this.client.openTickets.delete(message.author.id) &&
					msg.delete() &&
					message.author.send(
						`> 😢 | No one was able to claim your ticket, open a new one or reach out to a staff member directly!`
					)
				);

			const claimerId = collector
				.first()
				.users.cache.filter((u) => u.id !== this.client.user.id)
				.first().id;
			const claimer = guild.members.cache.get(claimerId);
			const ticketChannel = await guild.channels.create(`${message.author.id}-ticket`, {
				type: "text",
				topic: `${claimer.id}| Do not edit this channel. If you edit it you might break the system!`,
				parent: categoryId,
			});

			ticketChannel.updateOverwrite(claimer, {
				SEND_MESSAGES: true,
				VIEW_CHANNEL: true,
				ATTACH_FILES: true,
			});
			ticketChannel.updateOverwrite(svRole, {
				SEND_MESSAGES: false,
				VIEW_CHANNEL: false,
			});
			ticketChannel.updateOverwrite(mRole, {
				SEND_MESSAGES: true,
				VIEW_CHANNEL: true,
			});
			ticketChannel.updateOverwrite(guild.me, {
				SEND_MESSAGES: true,
				VIEW_CHANNEL: true,
				ATTACH_FILES: true,
			});
			ticketChannel.updateOverwrite(guild.id, {
				SEND_MESSAGES: false,
				VIEW_CHANNEL: false,
			});
			ticketChannel.updateOverwrite("304986851310043136", {
				SEND_MESSAGES: true,
				VIEW_CHANNEL: true,
				ATTACH_FILES: true,
			});

			embed.setDescription([
				`>>> ${prEmoji} | **Department**: ${dep}`,
				`🏷 | **Title/topic**: ${title.length > 200 ? title.substr(0, 200 - 3) + "..." : title}`,
				`📄 | **Description**: ${
					description.length > 200 ? description.substr(0, 200 - 3) + "..." : description
				}`,
				`📂 | **Extra**: ${extra.length > 400 ? extra.substr(0, 400 - 3) + "..." : extra}`,
				`👤 | **Claimer**: ${claimer.toString()}`,
			]);
			msg.delete();
			embed.setTitle(`Ticket opened by ${message.author.tag}`);
			ticketChannel.send(embed);
			message.author.send(
				`> 👥 | Your ticket is claimed by **${
					claimer.nickname || claimer.user.username
				}**, you should receive a response shortly.`
			);

			ticket.create({
				userId: message.author.id,
				channelId: ticketChannel.id,
				lastMessage: Date.now(),
			});
			this.client.openTickets.delete(message.author.id);
		} catch (e) {
			this.client.openTickets.delete(message.author.id);
			message.author.send(`> ❗ | Oh no, this shouldn't happen: \n\`\`\`\n${e}\n\`\`\``);
		}
	}

	// report system
	async report(message: Message) {
		const guild = this.client.guilds.cache.get(guildId);
		const emojiFilter = (reaction: MessageReaction, user: User) => {
			return user.id === message.author.id && emojiNames.includes(reaction.emoji.name);
		};
		const filter = (m: Message) => {
			return m.author.id === message.author.id;
		};

		const member = guild.members.cache.get(message.author.id).partial
			? await guild.members.fetch(message.author.id)
			: guild.members.cache.get(message.author.id);

		const dmChannel = await member.createDM();
		let cancelled: boolean = false;
		let department: string = "";
		let title: string = "";
		let description: string = "";
		let extra: string = "";
		let fileUrls: string[] = [];

		let types: string[] = ["department", "title", "description", "extra"];
		let emojis: string[] = [qdEmoji, dsEmoji, gdEmoji, prEmoji];
		let emojiNames: string[] = ["Driver", "Dispatcher", "Guard", "PRLogo"];

		for await (const type of types) {
			if (cancelled) return;
			switch (type) {
				case "department":
					const embed = new MessageEmbed()
						.setAuthor(
							"Select a department to continue:",
							this.client.user.displayAvatarURL({ dynamic: true, size: 4096 })
						)
						.setColor("#061A29")
						.setDescription([
							"Is your report related to a **role**? \n If not, select `any department`! \n",
							`> ${qdEmoji} | **Driver Department**`,
							`> ${dsEmoji} | **Dispatch Department**`,
							`> ${gdEmoji} | **Guard Department**`,
							`> ${prEmoji} | **Any Department** \n`,
							"React to an emoji below to continue. \n This prompt will close in `60` seconds!",
						]);

					const depMsg = await dmChannel.send(embed);
					for (const emoji of emojis) depMsg.react(emoji);
					const depCollector = await depMsg
						.awaitReactions(emojiFilter, {
							time: 6e4,
							max: 1,
							errors: ["time"],
						})
						.catch((e) => new Collection<string, MessageReaction>());
					if (!depCollector.size) {
						cancelled = true;
						depMsg.delete();
						return dmChannel.send(`> ❌ | The prompt is cancelled.`);
					}

					switch (depCollector.first().emoji.name) {
						case emojiNames[0]:
							department = "Driver Department";
							depMsg.delete();
							dmChannel.send(`> ${qdEmoji} | You selected the **${department}**.`);
							break;
						case emojiNames[1]:
							department = "Dispatch Department";
							depMsg.delete();
							dmChannel.send(`> ${dsEmoji} | You selected the **${department}**.`);
							break;
						case emojiNames[2]:
							department = "Guard Department";
							depMsg.delete();
							dmChannel.send(`> ${gdEmoji} | You selected the **${department}**.`);
							break;
						case emojiNames[3]:
							department = "Any Department";
							depMsg.delete();
							dmChannel.send(`> ${prEmoji} | You selected the **${department}**.`);
							break;
					}
					break;
				case "title":
					const titleMsg = await dmChannel.send(
						`> 📝 | Who are you reporting? (Roblox username, at least 1)`
					);
					const titleCollector = await dmChannel
						.awaitMessages(filter, { time: 6e4, max: 1, errors: ["time"] })
						.catch((e) => new Collection<string, Message>());
					if (!titleCollector.size) {
						cancelled = true;
						return titleMsg.edit(`> ❌ | The prompt is cancelled.`);
					}
					title = titleCollector.first().content;
					titleMsg.edit(
						`> 📁 | You answered: \`${
							title.length > 1800 ? title.substr(0, 1800 - 3) + "..." : title
						}\`.`
					);
					break;
				case "description":
					const descMsg = await dmChannel.send(
						`> 📝 | Give us as much detail as possible why you report this user (screenshots can be added in the next step).`
					);
					const descCollector = await dmChannel
						.awaitMessages(filter, { time: 12e4, max: 1, errors: ["time"] })
						.catch((e) => new Collection<string, Message>());
					if (!descCollector.size) {
						cancelled = true;
						return titleMsg.edit(`> ❌ | The prompt is cancelled.`);
					}
					description = descCollector.first().content;
					descMsg.edit(
						`> 📁 | You answered: \`${
							description.length > 1800 ? description.substr(0, 1800 - 3) + "..." : description
						}\`.`
					);
					break;
				case "extra":
					const extraMsg = await dmChannel.send(
						`> 📝 | Please attach a full, uncropped screenshot as evidence. (at least 1)`
					);
					const extraCollector = await dmChannel
						.awaitMessages(filter, { time: 6e4, max: 1, errors: ["time"] })
						.catch((e) => new Collection<string, Message>());
					if (extraCollector.size === 0) {
						cancelled = true;
						return extraMsg.edit(`> ❌ | The prompt is cancelled.`);
					}

					// if (
					// 	extraCollector.first().attachments.size === 0 ||
					// 	!extraCollector.first().content.includes(".png") ||
					// 	!extraCollector.first().content.includes(".jpg")
					// ) {
					// 	cancelled = true;
					// 	return extraMsg.edit(`> ❌ | The prompt is cancelled.`);
					// }
					const files = this.getAttachments(extraCollector.first().attachments);
					extra = extraCollector.first().content;
					await dmChannel.send(
						`> 📁 | You answered: \`${
							extra.length > 1800 ? extra.substr(0, 1800 - 3) + "..." : extra
						}\`.`,
						{
							files,
						}
					);
					extra = extraCollector.first().content;
					fileUrls = files;
					break;
			}
		}

		let channel: TextChannel;
		switch (department) {
			case "Driver Department":
				channel = await this.getChannel(DrivingReports);
				break;
			case "Dispatch Department":
				channel = await this.getChannel(DispatchReports);
				break;
			case "Guard Department":
				channel = await this.getChannel(guardReports);
				break;
			case "Any Department":
				channel = await this.getChannel(otherReports);
				break;
		}

		const reportMsg = await channel.send(
			new MessageEmbed()
				.setDescription([
					`>>> ${prEmoji} | **Department**: ${department}`,
					`🏷 | **Reason**: ${title.length > 200 ? title.substr(0, 200 - 3) + "..." : title}`,
					`📄 | **Description**: ${
						description.length > 200 ? description.substr(0, 200 - 3) + "..." : description
					}`,
					`📂 | **Extra**: ${extra.length > 400 ? extra.substr(0, 400 - 3) + "..." : extra}`,
				])
				.setTitle(`New Report from ${message.author.tag}`)
				.attachFiles(fileUrls)
				.setColor("#061A29")
		);

		["793929362570870794", "793939269848399873"].forEach((e) => reportMsg.react(e));
		return message.author.send(
			`>>> 👍 | We received your report. If you want to report more users, don't hesitate to use the report function again!`
		);
	}

	// chat system functions
	async getChannel(id: string): Promise<TextChannel> {
		return (this.client.channels.cache.get(id) ||
			(await this.client.channels.fetch(id))) as TextChannel;
	}
	async getUser(id: string): Promise<User> {
		return this.client.users.cache.get(id) || (await this.client.users.fetch(id));
	}
	filter(str: string): string {
		return str.replace(/`/g, "").replace(/\*/g, "");
	}
	getAttachments(attachments: Collection<string, MessageAttachment>): string[] {
		return attachments.map((a) => a.url);
	}
	async updateLastMSG(id: string): Promise<void> {
		const lastMessage = Date.now();
		ticket.findOneAndUpdate({ userId: id }, { lastMessage });
	}
}
