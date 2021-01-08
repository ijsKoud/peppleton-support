const { Client, MessageEmbed } = require("discord.js");

const map = new Map();
const ratelimited = new Map();

/**
 *
 * @param {Client} client
 */
module.exports = async function timeout(client) {
	const ids = [
		"744204090480787456",
		"747197931597070480",
		"705523496159281166",
	];

	const modlog = await client.channels.fetch("797076233912713236");

	client.on("message", async (m) => {
		if (ratelimited.has(m.channel.id) || !ids.includes(m.channel.id)) return;

		const count = map.get(m.channel.id) || 0;
		if (count == 0) setTimeout(() => map.delete(m.channel.id), 6e5);
		map.set(m.channel.id, count + 1);

		if (!ratelimited.has(m.channel.id) && count >= 125) {
			const ratelimit = count >= 125 ? 5 : 10;
			m.channel.setRateLimitPerUser(ratelimit);

			const embed = new MessageEmbed()
				.setTitle("Channel ratelimit changed")
				.setColor("#d17804")
				.setDescription([
					`> 🏷 | **Channel**: ${m.channel.toString()}`,
					`> ⏳ | **RateLimit**: \`${m.channel.rateLimitPerUser}s\``,
					`> ⌚ | **Duration**: \`30m\``,
				]);

			modlog.send(embed).catch((e) => console.log(e));
			ratelimited.set(m.channel.id, true);

			setTimeout(() => {
				m.channel.setRateLimitPerUser(0);
				ratelimited.delete(m.channel.id);
			}, 18e5);
		}
	});
};
