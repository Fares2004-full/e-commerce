const sanitizeUser = (user) => {
  const userObj = user.toObject();

  delete userObj.passwordHash;
  delete userObj.__v;

  return userObj;
};

export default sanitizeUser;
