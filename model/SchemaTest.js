const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const userSchema = new Schema({
  googleId: String,
  name: String,
  email: String,
  accessToken: String,
  refreshToken: String
});

userSchema.statics.findOrCreate = async function findOrCreate(profile) {
  const { id, displayName, emails } = profile;
  let name = displayName;
  let email = emails[0].value;
  try {
      const user = await this.findOne({ googleId: id });
      if (user) {
          console.log("User ", name , " is already in database")
      }
      else if (!user) {
        const newUser = await this.create({ googleId: id, name, email });  
        console.log("User " , name, " has been added to database")
      }
       
  } catch (error) {
      throw error;
  }
};

const User = model('User', userSchema);

module.exports = User;