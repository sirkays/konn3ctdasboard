import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const capitalize = (value = "") => {
  const str = String(value ?? "").trim();
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const formatDate = (dateString, time = true) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const monthName = months[date.getMonth()];
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();

  if (!time) {
    return `${monthName} ${day}, ${year}`;
  }

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  const formattedHours = hours ? String(hours).padStart(2, "0") : "12";

  return `${monthName} ${day}, ${year} • ${formattedHours}:${minutes} ${ampm}`;
};

export const byteToMB = (byte) => {
  return (byte / (1024 * 1024)).toFixed(2);
};

export const extractYouTubeID = (url) => {
  console.log(url);
  const regex = /[?&]v=([a-zA-Z0-9_-]+)/;
  const match = url.match(regex);

  const res = match ? match[1] : null;
  console.log(res);
  return res;
};
