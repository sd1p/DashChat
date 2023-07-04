const timeConversion = (params) => {
  if (params === undefined || null) {
    return "";
  }
  let time = new Date(params);
  time = time.toLocaleString("en-GB", {
    timeStyle: "short",
    hour12: true,
  });
  return time;
};

export default timeConversion;
