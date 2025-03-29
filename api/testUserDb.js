import User from "./models/user.js";


const checkUsers = async () => {
  const users = await User.find().select("clerkId email");
  console.log(users);
};

checkUsers();