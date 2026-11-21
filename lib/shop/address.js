// Joins a street address and a city for display and for delivery records.
// Some saved addresses already name the city, so the city is only added when it is not already there.

/** @returns {string} "Plot 12, Karachi" or just the address when it already mentions the city. */
export function joinAddress(address, city) {
  const street = String(address ?? "").trim();
  const town = String(city ?? "").trim();
  if (!town) {
    return street;
  }
  if (street.toLowerCase().includes(town.toLowerCase())) {
    return street;
  }
  return street ? `${street}, ${town}` : town;
}
