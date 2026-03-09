export const getDefaultRouteByRole = (role) => {
  if (role === "company") return "/company";
  if (role === "admin") return "/admin";
  return "/user";
};

export const getProfileDisplayName = (user) => {
  if (!user) return "Guest";
  if (user.name && user.name.trim()) return user.name.trim();
  if (user.email) return user.email.split("@")[0];
  return user.role === "company" ? "Company" : "User";
};

export const getProfileInitials = (user) => {
  const name = getProfileDisplayName(user);
  const words = name.split(" ").filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};
