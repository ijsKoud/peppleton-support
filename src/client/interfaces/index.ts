export interface iDepartment {
	name: string;
	guild: {
		reports: string;
		tickets: string;
		roleIds: string[];
	};
	emojis: {
		main: string;
		fallback: string;
	};
}

export interface iTicket {
	status: "unclaimed" | "closed" | "open";
	userId: string;
	caseId: string;
	lastMsg: number;
	channelId?: string;
	claimerId?: string;
	closekey?: string;
}

export interface iReport {
	userId: string;
	caseId: string;
	channelId: string;
	messageId: string;
}

export interface reactionRole {
	reactionId: string;
	messageId: string;
	roleId: string;
}

export interface iStats {
	userId: string;
	guildId: string;
	messages: number[];
	voice: number;
}
