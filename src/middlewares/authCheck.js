import jwt from "jsonwebtoken";
import User from "../models/User.model.js";

const removePassword = (user) => {
  let userWithoutPassword = user.toObject();
  delete userWithoutPassword.password;
  return userWithoutPassword;
};

const authCheck = async (req, res, next) => {
  const { auth_token } = req?.cookies;

  if (!auth_token) {
    return res
      .status(401)
      .json({ message: "Unauthorized: token not available" });
  }

  const decoded = jwt.verify(auth_token, process.env.JWT_SECRET);

  if (!decoded) {
    return res.status(401).json({ message: "Unauthorized: token not decoded" });
  }

  const { _id, email } = decoded;

  const user = await User.findOne({ _id, email });

  if (!user) {
    return res.status(401).json({ message: "Unauthorized: User not found" });
  }

  const userWithoutPassword = removePassword(user);

  req.user = userWithoutPassword;

  next();
};

export default authCheck;
