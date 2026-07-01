// Format an ISO date string (or undefined/null) as a short local time, e.g.
// "9:41 PM". Returns "" when there's nothing to show.
const timeConversion = (params?: string | null): string => {
  if (params === undefined || params === null) {
    return "";
  }
  return new Date(params).toLocaleString("en-GB", {
    timeStyle: "short",
    hour12: true,
  });
};

export default timeConversion;
