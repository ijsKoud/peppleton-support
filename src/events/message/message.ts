import { tDepartments, rDepartments } from "./../../mocks/departments";
import { Message, Collection, MessageReaction, MessageEmbed, User } from "discord.js";
import { Listener } from "discord-akairo";
import { iDepartment, iTicket } from "../../models/interfaces";
import Ticket from "../../models/tickets/Ticket";
import { nanoid } from "nanoid";

const cache = new Collection<string, iTicket>();
export default class MessageEvent extends Listener {
	constructor() {
		super("message", {
			emitter: "client",
			event: "message",
		});
	}

	async exec(message: Message) {
		if (message.system || message.webhookID || message.author.bot) return;
		if (message.mentions.users.has(this.client.user.id) && message.content.startsWith("<@"))
			return this.createTicket(message);

		if (message.channel.type === "text" && !message.channel.name.endsWith("-ticket")) return;

		switch (message.channel.type) {
			case "text":
				{
					if (!message.content.startsWith(process.env.PREFIX + "message")) return;

					const id = message.channel.name;
					let ticket = cache.get(id);

					if (!ticket) {
						ticket = await Ticket.findOne({ channelId: message.channel.id });
						if (!ticket) return;

						cache.set(id, ticket);
						setTimeout(() => cache.delete(id), 5e3);
					}

					if (ticket.claimerId !== message.author.id) return;

					const [, ...msg] = message.content.trim().split(/ +/g);
					const user = await this.client.utils.fetchUser(ticket.userId);
					if (!user) return await Ticket.findOneAndDelete({ userId: ticket.userId });

					const files = this.client.utils.getAttachments(message.attachments);
					user.send(
						`>>> 💬 | Response from ${message.author.toString()}:\n\`\`\`\n${msg.join(
							" "
						)}\n\`\`\``,
						{ split: true, files }
					);
				}
				break;
			case "dm":
				{
					if (message.content.startsWith(process.env.PREFIX)) return;

					let ticket = cache.find((t) => t.userId === message.author.id);
					if (!ticket) {
						ticket = await Ticket.findOne({ userId: message.author.id });
						if (!ticket) return;

						const id = `${ticket.caseId.split("-")[1].slice(0, -1)}-ticket`;
						cache.set(id, ticket);
						setTimeout(() => cache.delete(id), 5e3);
					}

					const channel = await this.client.utils.getChannel(ticket.channelId);
					if (!channel) return await Ticket.findOneAndDelete({ userId: message.author.id });

					const files = this.client.utils.getAttachments(message.attachments);
					channel.send(
						`>>> 💬 | Response from ${message.author.toString()}:\n\`\`\`\n${
							message.content
						}\n\`\`\`Use \`${this.client.commandHandler.prefix}message <message>\` to respond.`,
						{ split: true, files }
					);
				}
				break;
			default:
				return;
		}

		message.react("✅");
	}

	async createTicket(message: Message) {
		const filter = (m: Message) => {
			return m.author.id === message.author.id;
		};
		const selectorFilter = (reaction: MessageReaction, user: User) => {
			return user.id === message.author.id && ["1️⃣", "2️⃣", "3️⃣"].includes(reaction.emoji.name);
		};

		const emojis = tDepartments.map(
			({ emoji, fallback }) => this.client.emojis.cache.get(emoji)?.toString() || fallback
		);
		const emojiFilter = (reaction: MessageReaction, user: User) => {
			return (
				user.id === message.author.id &&
				emojis.includes(reaction.emoji.toString() || reaction.emoji.name)
			);
		};

		try {
			let embed: MessageEmbed = new MessageEmbed()
				.setColor(this.client.hex)
				.setFooter(
					"Prompt will close in 60 seconds",
					this.client.user.displayAvatarURL({ dynamic: true, size: 4096 })
				)
				.setAuthor("Select one of the options to continue")
				.setDescription([
					"1️⃣ - I want to open a ticket",
					"2️⃣ - I want to report a user",
					"3️⃣ - I want to make a suggestion.",
				]);

			let msg: Message = await message.author.send(embed).catch((e) => null);
			const dm = await message.author.createDM();

			if (!msg)
				return message.channel.send(
					">>> 🔒 | Oops, It looks like your DMs are not open. Enable them so I can send you a DM.\nℹ | If you think I am wrong, please ping **DaanGamesDG#7621** for help."
				);

			["1️⃣", "2️⃣", "3️⃣"].forEach((e) => msg.react(e).catch((e) => null));
			let collector = await this.client.utils.awaitReactions(msg, selectorFilter);

			let option: string;
			let department: iDepartment;
			let info: { 1: string; 2: string; 3: string; attachments: string[] } = {
				1: "",
				2: "",
				3: "",
				attachments: [],
			};

			option = collector.first()?.emoji?.name || "";
			switch (option) {
				case "1️⃣":
				case "2️⃣":
					{
						msg.delete().catch((e) => null);
						if (!this.client.tickets && option === "1️⃣")
							return message.author.send(
								">>> 🔒 | Tickets are currently closed, please try again later!"
							);

						msg = await dm.send(
							embed
								.setAuthor("Please select a department")
								.setDescription(tDepartments.map(({ name }, i) => `${emojis[i]} - **${name}**`))
						);
						emojis.forEach((e) => msg.react(e).catch((e) => null));
					}
					break;
				default:
					return;
			}

			collector = await this.client.utils.awaitReactions(msg, emojiFilter);
			if (!collector.size) return msg.delete();

			department = (option === "1️⃣" ? tDepartments : rDepartments).find(({ emoji, fallback }) =>
				[emoji, fallback].includes(collector.first().emoji.id || collector.first().emoji.name)
			);
			msg.delete();

			switch (option) {
				case "1️⃣":
					if (await Ticket.findOne({ userId: message.author.id })) return;

					// topic
					msg = await dm.send(
						`>>> 🎫 | Ticket creation - **${department.name}**\n\`1\` - What is the topic of your question? Please keep it short, you can explain everything in the next step.`
					);
					info[1] = (await this.client.utils.awaitMessages(msg, filter)).first()?.content;
					if (!info[1]) return msg.delete();

					// description
					msg = await dm.send(
						`>>> 🎫 | Ticket creation - **${department.name}**\n\`2\` - Explain in full what your question is. You can add images if necessary in the last step.`
					);
					info[2] = (await this.client.utils.awaitMessages(msg, filter)).first()?.content;
					if (!info[2]) return msg.delete();

					// extra
					msg = await dm.send(
						`>>> 🎫 | Ticket creation - **${department.name}**\n\`3\` - Add screenshots / links here, if you don't have any you can say \`no attachments\` to skip this part.`
					);
					const res = await this.client.utils.awaitMessages(msg, filter);
					info[3] = res.first()?.content;
					if (!info[3]) return msg.delete();

					info["attachments"] = this.client.utils.getAttachments(res.first().attachments);
					break;
				case "2️⃣":
					break;
				default:
					return;
			}

			let id = `[ticket-${nanoid(5)}]`;
			while (await this.client.utils.checkId(id)) {
				id = `[ticket-${nanoid(5)}]`;
			}

			embed = new MessageEmbed()
				.setColor(this.client.hex)
				.setAuthor(
					`${message.author.tag} - ticket id: ${id}`,
					message.author.displayAvatarURL({ dynamic: true, size: 4096 })
				)
				.setDescription(
					`Ticket created by ${message.author.toString()}\nReact with \`✅\` to claim this ticket!`
				)
				.addField("• Topic", info[1].substr(0, 1024), true)
				.addField("• Description", info[2].substr(0, 1024), true)
				.addField("• Extra", info[3].substr(0, 1024), true)
				.attachFiles(info["attachments"]);

			const channel = await this.client.utils.getChannel(department.channelId);
			channel.send(embed).then((m) => m.react("✅"));
			await Ticket.create({
				status: "unclaimed",
				userId: message.author.id,
				lastMsg: Date.now(),
				caseId: id,
				messageId: msg.id,
			});

			dm.send(
				`>>> 🎫 | Ticket registered under \`${id}\`\nPlease contact a **staff member** using this id if you don't get an answer within **24 hours**.`
			);
		} catch (e) {
			this.client.log("ERROR", `Ticket creation error: \`\`\`${e}\`\`\``);
		}
	}
}
