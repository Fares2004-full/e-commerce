const isValidGmail = (email) =>
  typeof email === "string" && /^[A-Za-z0-9._%+-]+@gmail\.com$/.test(email);

const isStrongEnoughPassword = (password) =>
  typeof password === "string" &&
  password.length >= 8 &&
  /[A-Za-z]/.test(password) &&
  /[0-9]/.test(password);

export { isValidGmail, isStrongEnoughPassword };
