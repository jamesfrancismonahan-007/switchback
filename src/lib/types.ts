export const LEVELS = ["Easy", "Moderate", "Hard", "Extreme"] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_COLORS: Record<Level, { bg: string; fg: string }> = {
  Easy: { bg: "#E1F0E6", fg: "#1E5A3A" },
  Moderate: { bg: "#E0EAF5", fg: "#24527D" },
  Hard: { bg: "#FBE3D3", fg: "#8A3A0F" },
  Extreme: { bg: "#F6DADA", fg: "#7A1F1F" },
};

export type Area = {
  id: string;
  name: string;
  short_name: string;
  state: string;
  lat: number;
  lng: number;
};

export type Profile = {
  id: string;
  display_name: string;
  birthdate: string;
  bio: string;
  levels: Level[];
  availability: string;
  top_hikes: string[];
  home_area: string;
  travel_area: string | null;
  travel_from: string | null;
  travel_to: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type MatchRow = {
  match_id: string;
  created_at: string;
  other: Profile;
  last_body: string | null;
  last_at: string | null;
};

export type Message = {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  kind: "text" | "system";
  created_at: string;
};

export type TripRow = {
  id: string;
  host_id: string;
  host_name: string;
  area_id: string;
  trail: string;
  starts_at: string;
  level: Level;
  spots: number;
  note: string;
  accepted: number;
  pending: number;
  my_status: "pending" | "accepted" | "declined" | null;
};

export type HikePlan = {
  id: string;
  user_id: string;
  match_id: string | null;
  trail: string;
  partner_name: string;
  back_by: string;
  contact_name: string;
  contact_phone: string;
  checked_in_at: string | null;
  alert_sent_at: string | null;
};
