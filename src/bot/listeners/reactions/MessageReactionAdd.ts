import { Listener, ListenerOptions } from "@sapphire/framework";
import { ApplyOptions } from "@sapphire/decorators";
import { Guild, Message, MessageReaction, User } from "discord.js";
import Logger from "../../../client/structures/Logger";
import { GoogleSpreadsheet } from "google-spreadsheet";

@ApplyOptions<ListenerOptions>({ once: false, event: "messageReactionAdd" })
export default class MessageReactionAddListener extends Listener {
	private cooldowns = new Map<string, number>();
	private logger!: Logger;

	public async run(reaction: MessageReaction, user: User) {
		const { client } = this.container;
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		this.logger = client.loggers.get("bot")!;

		try {
			if (reaction.partial) reaction = await reaction.fetch();
			if (reaction.message.partial) reaction.message = await reaction.message.fetch();
			if (user.partial) user = await user.fetch();
			if (!reaction.message.guild) return;

			if (client.constants.reactionRoles.channel === reaction.message.channel.id)
				return this.reactionRole(reaction.emoji.name ?? "", reaction.message.guild, user);

			const feedback = await client.prisma.feedback.findFirst({
				where: { guildId: reaction.message.guild.id },
			});
			if (feedback && feedback.messageId === reaction.message.id && reaction.emoji.name === "📋")
				await this.feedback(reaction.message, user);
		} catch (e) {
			this.logger.error(
				`messageReactionAdd event error: \`\`\`${(e as any).stack || (e as any).message}\`\`\``
			);
		}
	}

	async reactionRole(id: string, guild: Guild, user: User) {
		const { client } = this.container;
		const reactionRole = client.constants.reactionRoles.roles.find((r) => r.reactionId === id);
		if (!reactionRole) return;

		const member = await client.utils.fetchMember(user.id, guild);
		if (!member) return;

		const role = await client.utils.getRole(reactionRole.roleId, guild);
		if (!role) return;

		await member.roles.add(role);
		await member
			.send(`>>> ${reactionRole.reactionId} | I just gave you the **${role.name}** role!`)
			.catch(() => void 0);
	}

	async feedback(message: Message, user: User) {
		const { client } = this.container;

		const blacklist = client.blacklistManager.isBlacklisted(user.id);
		if (blacklist || user.bot) return;

		const cooldown = this.cooldowns.get(user.id) ?? 0;
		if (cooldown > 2)
			return this.logger.warn(
				`Feedback - Blocking feedback request from user **${
					user.tag
				}** (${user.toString()})\nReason: \`Overloading the API\``
			);

		const msg = await user
			.send(`>>> ${client.constants.emojis.loading} | Searching for your feedback, please wait...`)
			.catch(() => null);

		if (!message) return;

		try {
			if (cooldown === 0) setTimeout(() => this.cooldowns.delete(user.id), 5e3);
			this.cooldowns.set(user.id, cooldown + 1);

			const doc = new GoogleSpreadsheet(process.env.SHEET);
			doc.useApiKey(process.env.API_KEY ?? "");
			await doc.loadInfo();

			const sheet = doc.sheetsByIndex[0];
			const rows = await sheet.getRows();
			const data = rows.find((r) => r.discordID == user.id);
			const state = rows.find((r) => r.discordID == user.id);

			if (data && (!state || !state.passed || !state.feedback))
				throw new Error(
					`Missing \`state\` object, \`state.passed\` or \`state.feedback\` property.\nData provided:\nState {\npassed: ${
						state?.passed ? "found" : "not found"
					},\nfeedback: ${state?.feedback ? "found" : "not found"}\n}`
				);
			const feedback = data
				? `>>> ${client.constants.emojis.logo} | You **${
						state?.passed
				  }** this application session, here is your feedback: \`\`\`${
						(data.feedback as string).length > 850
							? (data.feedback as string).substr(0, 850 - 3) + "..."
							: (data.feedback as string)
				  }\`\`\` ❓ | Questions about the feedback? Mention me to create a ticket.`
				: ">>> 👤 | Sorry I didn't find your user id in the database, if you think I am wrong, please open a ticket.";

			await msg?.edit(feedback);
		} catch (e) {
			await msg
				?.edit(
					`>>> ${client.constants.emojis.redcross} | Oops, something went wrong. Please try again later!`
				)
				.catch(() => void 0);
			this.logger.error(
				`Feedback - Blocking feedback request from user **${
					user.tag
				}** (${user.toString()})\nReason: \`ERROR\`\n\`\`\`\n${
					(e as any).stack || (e as any).message
				}\n\`\`\``
			);
		}
	}
}
