import { iDepartment } from "./../models/interfaces";

// roleIds: ["department_sv", "MANAGER", "BoD"];
export const tickets: iDepartment[] = [
	{
		name: "Driver Department",
		guild: {
			reports: "798639223817109525",
			tickets: "780500364448235530",
			roleIds: ["770360459114315806", "777976351201820673", "742790053998362768"],
		},
		emojis: {
			main: "793907766476668938",
			fallback: "1️⃣",
		},
	},
	{
		name: "Dispatch Department",
		guild: {
			reports: "798639351012655124",
			tickets: "780500364448235530",
			roleIds: ["770360455763198032", "767073132682149889", "742790053998362768"],
		},
		emojis: {
			main: "793907746390933534",
			fallback: "2️⃣",
		},
	},
	{
		name: "Guard Department",
		guild: {
			reports: "798639473373085758",
			tickets: "780500364448235530",
			roleIds: ["770360452395171872", "777976379395538960", "742790053998362768"],
		},
		emojis: {
			main: "793907789349126214",
			fallback: "3️⃣",
		},
	},
	{
		name: "Signaller Department",
		guild: {
			reports: "807944776204812300",
			tickets: "780500364448235530",
			roleIds: ["807768040086437897", "807759039298928661", "742790053998362768"],
		},
		emojis: {
			main: "818560264990752818",
			fallback: "4️⃣",
		},
	},
	{
		name: "Any Department",
		guild: {
			reports: "798639622380453929",
			tickets: "780500364448235530",
			roleIds: [
				"777615536997531669",
				"735204683475583008",
				"817438200896159775",
				"792930500292378625",
				"743051369551757332",
				"742790053998362768",
			],
		},
		emojis: {
			main: "818564584679538708",
			fallback: "5️⃣",
		},
	},
];

export const transfer = [
	{
		name: "Managers Department",
		id: "manager",
		channelId: "",
	},
	{
		name: "Developers Department",
		id: "developer",
		channelId: "",
	},
	{
		name: "Directors Department",
		id: "director",
		channelId: "",
	},
];

export const category = "754266502638600233";
export const transcript = "793203715154378752";
export const suggestions = "788811272899919872";

export const manager = "742791627495571596";
export const botDev = "773626906800422933";
