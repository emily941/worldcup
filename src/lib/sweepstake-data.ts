export interface Participant {
  name: string;
  teams: string[];
}

export const participants: Participant[] = [
  { name: "Dave", teams: ["Spain", "Ecuador", "Belgium", "Colombia"] },
  { name: "Dot", teams: ["Australia", "Algeria", "Switzerland", "Argentina"] },
  { name: "Tom", teams: ["Croatia", "France", "New Zealand", "Germany"] },
  { name: "Dan W", teams: ["Austria", "Netherlands", "England", "Bosnia & Herzegovina"] },
  { name: "Dan M", teams: ["Turkey", "Czechia", "Qatar", "Mexico"] },
  { name: "Kate", teams: ["Uruguay", "Curacao", "Jordan", "South Africa"] },
  { name: "Sophie", teams: ["Sweden", "Portugal", "Saudi Arabia", "Cape Verde"] },
  { name: "Colin", teams: ["Senegal", "Ivory Coast", "DRC", "Norway"] },
  { name: "Emily", teams: ["Morocco", "Brazil", "Japan", "Canada"] },
  { name: "Ali", teams: ["Ghana", "Iran", "Scotland", "South Korea"] },
  { name: "Pandy", teams: ["Paraguay", "Iraq", "Panama"] },
  { name: "George", teams: ["USA", "Uzbekistan", "Tunisia"] },
  { name: "Olive", teams: ["Haiti", "Egypt"] },
];

export const teamToParticipant: Record<string, string> = {};
for (const p of participants) {
  for (const team of p.teams) {
    teamToParticipant[team] = p.name;
  }
}
