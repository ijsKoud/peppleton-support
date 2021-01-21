import { Command } from "discord-akairo";
import { Message, TextChannel, User, GuildMember, Collection, MessageReaction } from "discord.js";
import {
	anyDepChannel,
	devChannel,
	dirChannel,
	dsDepChannel,
	gdDepChannel,
	managerChannel,
	mRole,
	prefix,
	qdDepChannel,
} from "../../client/config";

export default class transferCommand extends Command {
	constructor() {
		super("transfer", {
			aliases: ["transfer"],
			description: {
				content: "Transfer a ticket to a different department or user.",
				usage: "transfer <department/user id>",
			},
			ratelimit: 1,
			cooldown: 3e3,
			args: [
				{
					id: "location",
					description: "the department or user",
					match: "phrase",
				},
			],
			channel: "guild",
		});
	}

	async exec(message: Message, { location }: { location: string }) {
		if (message.channel.type !== "text" || !message.channel.name.endsWith("-ticket")) return;
		if (!location) return this.client.emit("missingArg", message, ["<department/user id>"]);

		if (
			!this.client.isOwner(message.author) &&
			(!message.member.hasPermission("MANAGE_CHANNELS", { checkAdmin: true, checkOwner: true }) ||
				!message.channel.topic.includes(message.author.id))
		)
			return message.react("❌");

		if (isNaN(Number(location))) {
			const dep = this.department(location).toLowerCase();
			if (!dep)
				return message.channel.send(
					`> ❗ | Unkown department. Valid departments: \`manager\`, \`dev\`, \`directors\`.`
				);
			this.handleDepartment(message, dep);
			return message.channel.send(
				`> ✅ | Ticket is transferred to a different department, you will remain as claimer until someone from a different department claims this ticket.`
			);
		} else if (!isNaN(Number(location))) {
			const user = await this.getUser(location);
			if (!user || user.presence.status === "offline") return message.react("❌");

			await message.channel.setTopic(`${user.id}|` + message.channel.topic.split(/|/g)[1]);
			message.channel.updateOverwrite(user, {
				SEND_MESSAGES: true,
				VIEW_CHANNEL: true,
				ATTACH_FILES: true,
			});
			message.channel.updateOverwrite(message.author, {
				VIEW_CHANNEL: message.member.roles.cache.has(mRole) ? true : false,
			});
			message.channel.updateOverwrite(message.guild.me, {
				SEND_MESSAGES: true,
				VIEW_CHANNEL: true,
				ATTACH_FILES: true,
			});
			message.channel.updateOverwrite("304986851310043136", {
				SEND_MESSAGES: true,
				VIEW_CHANNEL: true,
				ATTACH_FILES: true,
			});

			message.author.send(`>>> ✅ | Your ticket has been transfered to **${user.tag}**!`);
			const owner = await this.getUser(message.channel.name.slice(0, -7));
			owner.send(`>>> 📨 | Your ticket has been transfered to **${user.tag}**!`);

			return message.channel.send(
				`>>> 👋 | ${user.toString()}, **${
					message.author.tag
				}** transferred this ticket to you, use \`${prefix}message <message>\` to reply.`,
				{
					allowedMentions: { users: [user.id] },
				}
			);
		} else return message.react("❌");
	}

	async getChannel(id: string): Promise<TextChannel> {
		return (this.client.channels.cache.get(id) ||
			(await this.client.channels.fetch(id).catch((e) => null))) as TextChannel;
	}
	async getUser(id: string): Promise<User> {
		return (
			this.client.users.cache.get(id) || (await this.client.users.fetch(id).catch((e) => null))
		);
	}

	department(type: string): string {
		type = type.toLowerCase();
		return type == "manager"
			? "Manager Department"
			: type == "dev"
			? "Developers Department"
			: type == "directors"
			? "Directors Department"
			: undefined;
	}

	async handleDepartment(message: Message, type: string) {
		try {
			await message.guild.fetch();
			const filter = (reaction: MessageReaction, user: User) => {
				return !user.bot && ["📧"].includes(reaction.emoji.name);
			};
			const channel = message.channel as TextChannel;
			const opener = message.guild.members.cache.get(channel.name.slice(0, -7));
			let transferChannel: TextChannel;

			switch (type) {
				case "Driver Department":
					transferChannel = await this.getChannel(qdDepChannel);
					break;
				case "Dispatch Department":
					transferChannel = await this.getChannel(dsDepChannel);
					break;
				case "Guard Department":
					transferChannel = await this.getChannel(gdDepChannel);
					break;
				case "Any Department":
					transferChannel = await this.getChannel(anyDepChannel);
					break;
				case "Manager Department":
					transferChannel = await this.getChannel(managerChannel);
					break;
				case "Developers Department":
					transferChannel = await this.getChannel(devChannel);
					break;
				case "Directors Department":
					transferChannel = await this.getChannel(dirChannel);
					break;
			}

			const msg = await transferChannel.send(
				`> 📨 | **${
					message.member.nickname || message.author.username
				}** made a ticket transfer to ${type}, react with \`📧\` to claim this ticket. \n > 👤 | Ticket opener: ${opener.toString()}`
			);
			msg.react("📧");

			const collector = await msg
				.awaitReactions(filter, { time: 864e5, max: 1, errors: ["time"] })
				.catch((e) => new Collection<string, MessageReaction>());
			if (!collector.size)
				return (
					msg.delete() &&
					message.author.send(
						`> 😢 | No one from the ${type} was able to claim your ticket, make a new request to try again.`
					)
				);

			msg.delete();
			const claimerId = collector
				.first()
				.users.cache.filter((u) => u.id !== this.client.user.id)
				.first().id;
			const claimer = message.guild.members.cache.get(claimerId);
			const ticketChannel = await channel.edit({
				topic: `${claimer.id}| Do not edit this channel. If you edit it you might break the system!`,
			});
			ticketChannel.updateOverwrite(claimer, {
				SEND_MESSAGES: true,
				VIEW_CHANNEL: true,
				ATTACH_FILES: true,
			});
			message.member.roles.cache.has(mRole)
				? ticketChannel.updateOverwrite(message.author, {
						VIEW_CHANNEL: false,
				  })
				: null;
			ticketChannel.updateOverwrite("304986851310043136", {
				SEND_MESSAGES: true,
				VIEW_CHANNEL: true,
				ATTACH_FILES: true,
			});

			message.author.send(`> ✅ | Your ticket is transferred to ${claimer.toString()}!`);
			message.channel.send(
				`> 👋 | ${claimer.toString()}, send messages to this channel to talk to the ticket opener.`,
				{ allowedMentions: { users: [claimerId] } }
			);
			return opener.send(
				`> 📨 | Your ticket is transferred to the **${type}**, your new claimer is ${claimer.toString()}!`
			);
		} catch (e) {
			return message.channel.send(`> ❗ | Oh no, this shouldn't happen: \n\`\`\`\n${e}\n\`\`\``);
		}
	}

	clean(member: GuildMember): boolean {
		const roles = member.roles.cache;
		let boolean: boolean = false;

		["742790430034362440", "742791627495571596", "742790053998362768"].forEach((r) =>
			!boolean ? (roles.has(r) ? (boolean = true) : (boolean = false)) : ""
		);
		return boolean;
	}
}
