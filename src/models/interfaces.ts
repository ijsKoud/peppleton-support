export const reqString = { required: true, type: String };
export const nString = { required: false, type: String };

export interface iDepartment {
	name: string;
	channelId: string;
	emoji: string;
	fallback: string;
}

export interface iTicket {
	status: "unclaimed" | "closed" | "open";
	userId: string;
	lastMsg?: number;
	caseId: string;
	channelId?: string;
	messageId?: string;
	claimerId?: string;
}

export interface reactionRole {
	reactionId: string;
	messageId: string;
	roleId: string;
}
