import { iDepartment } from "../interfaces";

export const category = "754266502638600233";
export const transcript = "793203715154378752";
export const suggestions = "788811272899919872";

export const supervisor = "742790430034362440";
export const manager = "777976351201820673";
export const BoD = "937016913664561182";
export const botDev = "773626906800422933";
export const admin = "881535202051096586";

// roleIds: ["department_sv", "MANAGER", "BoD"];
export const tickets: iDepartment[] = [
	{
		name: "Driver Department",
		guild: {
			reports: "798639223817109525",
			tickets: "780500364448235530",
			roleIds: [supervisor, "777976379395538960", BoD],
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
			roleIds: [supervisor, "767073132682149889", BoD],
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
			roleIds: [supervisor, "777976379395538960", BoD],
		},
		emojis: {
			main: "793907789349126214",
			fallback: "3️⃣",
		},
	},
	// {
	// 	name: "Signaller Department",
	// 	guild: {
	// 		reports: "807944776204812300",
	// 		tickets: "780500364448235530",
	// 		roleIds: [supervisor, "767073132682149889",BoD],
	// 	},
	// 	emojis: {
	// 		main: "818560264990752818",
	// 		fallback: "4️⃣",
	// 	},
	// },
	{
		name: "Any Department",
		guild: {
			reports: "798639622380453929",
			tickets: "780500364448235530",
			// tickets: "842506864964927500",
			// reports: "842506864964927500",
			roleIds: [supervisor, manager, BoD],
		},
		emojis: {
			main: "818564584679538708",
			// fallback: "5️⃣",
			fallback: "4️⃣",
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
