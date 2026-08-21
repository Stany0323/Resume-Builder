import React from "react";

export function DateRange({ startDate, endDate }: { startDate?: string; endDate?: string }) {
  const text = formatDateRange(startDate, endDate);

  return text ? <span className="resume-date-range">{text}</span> : null;
}

function formatDateRange(startDate?: string, endDate?: string) {
  if (!startDate && !endDate) {
    return "";
  }

  return `${startDate ?? ""} - ${endDate ?? ""}`;
}
