import { addTime, getPosition, getTimes } from "./vendor/suncalc.mjs?v=phopod-20261015";
addTime(-4, "blueMorningEnd", "blueEveningStart");
addTime(-8, "blueMorningStart", "blueEveningEnd");
const formatters = /* @__PURE__ */ new Map();
function localParts(date, zone) {
  if (!formatters.has(zone))
    formatters.set(
      zone,
      new Intl.DateTimeFormat("en-CA", {
        timeZone: zone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
      })
    );
  const parts = Object.fromEntries(
    formatters.get(zone).formatToParts(date).map((part) => [part.type, part.value])
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minute: Number(parts.hour) * 60 + Number(parts.minute)
  };
}
function localInstant(day, minute, zone) {
  const [year, month, date] = day.split("-").map(Number);
  const target = Date.UTC(
    year,
    month - 1,
    date,
    Math.floor(minute / 60),
    minute % 60
  );
  let instant = target;
  for (let i = 0; i < 3; i++) {
    const local = localParts(new Date(instant), zone);
    const [y, m, d] = local.date.split("-").map(Number);
    const wall = Date.UTC(
      y,
      m - 1,
      d,
      Math.floor(local.minute / 60),
      local.minute % 60
    );
    const correction = target - wall;
    if (!correction) break;
    instant += correction;
  }
  return new Date(instant);
}
function localTime(date, zone) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return "\u2014";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(date);
}
const compass = [
  "North",
  "Northeast",
  "East",
  "Southeast",
  "South",
  "Southwest",
  "West",
  "Northwest"
];
function lightCountdown(start, end, day, zone, now) {
  if (!(start instanceof Date) || !Number.isFinite(start.getTime()) || end !== null && end !== void 0 && (!(end instanceof Date) || !Number.isFinite(end.getTime())))
    return "No crossing today";
  const today = localParts(now, zone).date;
  if (day !== today) return day > today ? "Scheduled" : "Past date";
  const until = (target) => {
    const minutes = Math.max(
      1,
      Math.ceil((target.getTime() - now.getTime()) / 6e4)
    );
    return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes} min`;
  };
  if (now < start)
    return `${end ? "Starts" : "In"}${end ? " in " : " "}${until(start)}`;
  if (end instanceof Date && now < end) return `Ends in ${until(end)}`;
  return end ? "Finished" : "Passed";
}
function solarAt(instant, location) {
  const { date } = localParts(instant, location.timezone);
  const noon = localInstant(date, 720, location.timezone);
  const offset = (Date.UTC(
    ...date.split("-").map((v, i) => i === 1 ? Number(v) - 1 : Number(v)),
    12
  ) - noon.getTime()) / 6e4;
  const times = getTimes(
    noon,
    location.latitude,
    location.longitude,
    0,
    offset
  );
  const position = getPosition(instant, location.latitude, location.longitude);
  const beforeNoon = instant < times.solarNoon;
  const blueStart = beforeNoon ? times.blueMorningStart : times.blueEveningStart;
  const blueEnd = beforeNoon ? times.blueMorningEnd : times.blueEveningEnd;
  const isBetween = (start, end) => start instanceof Date && end instanceof Date && instant >= start && instant <= end;
  let status;
  let phaseStart;
  let phaseEnd;
  if (!times.sunrise && !times.sunset && position.altitude > 0) {
    status = "Polar daylight";
    phaseStart = null;
    phaseEnd = null;
  } else if (isBetween(blueStart, blueEnd)) {
    status = "Blue hour";
    phaseStart = blueStart;
    phaseEnd = blueEnd;
  } else if (isBetween(times.sunrise, times.goldenHourEnd) || isBetween(times.goldenHour, times.sunset)) {
    status = "Golden hour";
    phaseStart = beforeNoon ? times.sunrise : times.goldenHour;
    phaseEnd = beforeNoon ? times.goldenHourEnd : times.sunset;
  } else if (isBetween(times.sunrise, times.sunset)) {
    status = "Daylight";
    phaseStart = times.sunrise;
    phaseEnd = times.sunset;
  } else if (position.altitude >= -6) {
    status = "Civil twilight";
    phaseStart = beforeNoon ? times.dawn : times.sunset;
    phaseEnd = beforeNoon ? times.sunrise : times.dusk;
  } else if (position.altitude >= -12) {
    status = "Nautical twilight";
    phaseStart = beforeNoon ? times.nauticalDawn : times.dusk;
    phaseEnd = beforeNoon ? times.dawn : times.nauticalDusk;
  } else if (position.altitude >= -18) {
    status = "Astronomical twilight";
    phaseStart = beforeNoon ? times.nightEnd : times.nauticalDusk;
    phaseEnd = beforeNoon ? times.nauticalDawn : times.night;
  } else {
    status = "Night";
    phaseStart = null;
    phaseEnd = null;
  }
  const belowHorizon = position.altitude < 0;
  const sunsetMinutes = times.sunset ? Math.ceil((times.sunset.getTime() - instant.getTime()) / 6e4) : null;
  const light = {
    time: localTime(instant, location.timezone),
    window: phaseStart && phaseEnd ? `${localTime(phaseStart, location.timezone)}\u2013${localTime(phaseEnd, location.timezone)}` : status === "Night" ? "After twilight" : "No crossing today",
    status,
    sunDirection: belowHorizon ? "Below horizon" : compass[Math.round(position.azimuth / 45) % 8],
    sunAngle: position.azimuth,
    opportunityId: "",
    highlight: "east-west",
    sunset: localTime(times.sunset, location.timezone)
  };
  return {
    light,
    times,
    date,
    altitude: position.altitude,
    azimuth: position.azimuth,
    belowHorizon,
    sunsetMinutes
  };
}
export {
  lightCountdown,
  localInstant,
  localParts,
  localTime,
  solarAt
};
