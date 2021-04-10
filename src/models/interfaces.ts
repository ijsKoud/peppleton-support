export const strings = {
	required: { required: true, type: String },
	optional: { required: false, type: String },
};

export const numbers = {
	required: { required: true, type: Number },
	optional: { required: false, type: Number },
};

export interface iDepartment {
	name: string;
	guild: {
		channelId: string;
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
	lastMsg?: number;
	channelId?: string;
	messageId?: string;
	claimerId?: string;
}

export interface reactionRole {
	reactionId: string;
	messageId: string;
	roleId: string;
}
