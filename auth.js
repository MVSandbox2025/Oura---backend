const router = require("express").Router();
const passport = require("passport");
const jwt = require('jsonwebtoken');
require("dotenv").config();
//aaa
const secretKey = process.env.SECRET_KEY

router.get("/login/success", (req, res) => {
	if (req.user) {
		res.status(200).json({
			error: false,
			message: "Successfully Loged In",
			user: req.user,
		});
	} else {
		res.status(403).json({ error: true, message: "Not Authorized" });
	}
});

router.get("/login/failed", (req, res) => {
	res.status(401).json({
		error: true,
		message: "Log in failure",
	});
});

router.get("/google", passport.authenticate("google", ["profile", "email"]));
//
router.get(
	"/google/callback",
	passport.authenticate("google", {session:false}),
	function(req,res){
		const token = jwt.sign(req.user._json, secretKey, { expiresIn: '1h' });
		res.redirect(`${process.env.FRONTEND}?token=${token}`) 
	},
	function(req,res){
		res.status(401).send("Authentication Failed");
	}
);

router.get("/logout", (req, res) => {
	req.session.destroy(function(err) {
        if (err) {
            // Handle error
            console.error(err);
            res.status(500).send('Error logging out');
        } else {
            // Redirect after logout
            res.redirect(`${process.env.FRONTEND}/`);
        }
    });
});
//
router.get("/check-auth", (req, res) => {
    if (req.isAuthenticated()) {
        // User is authenticated
        res.status(200).json({ authenticated: true });
    } else {
        // User is not authenticated
        res.status(401).json({ authenticated: false });
    }
});

module.exports = router;//