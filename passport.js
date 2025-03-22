const GoogleStrategy = require("passport-google-oauth20").Strategy;
const passport = require("passport");
require("dotenv").config();
const User = require("./model/SchemaTest");
// console.log(process?.env?.CLIENT_ID);
passport.use(
	new GoogleStrategy(
		{
			clientID: process?.env?.CLIENT_ID,
			clientSecret: process.env.CLIENT_SECRET,
			callbackURL: `${process.env.BACKEND}/auth/google/callback`,
			scope: ["profile", "email"],
		},
		async function (accessToken, refreshToken, profile, done) {
			try {
				await User.findOrCreate(profile);
				done(null, profile);
			} catch (error) {
				cb(error);
			}
		}
	)
);

passport.serializeUser((user, done) => {
	done(null, user);
});

passport.deserializeUser((user, done) => {
	done(null, user);
});