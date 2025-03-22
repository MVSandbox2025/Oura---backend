const router = require("express").Router();
require("dotenv").config();

const stripeSecret = process?.env?.STRIPE_SECRET;
const EnhanceYearlyPriceID = process?.env?.ENHANCE_YEARLY_PRICEID;
const EnhanceMonthlyPriceID = process?.env?.ENHANCE_MONTHLY_PRICEID;
const EmpowerMonthlyPriceID = process?.env?.EMPOWER_MONTHLY_PRICEID;
const EmpowerYearlyPriceID = process?.env?.EMPOWER_YEARLY_PRICEID;
const stripe = require("stripe")(stripeSecret);
const paymentSchema = require("../model/paymentInfoSchema");
const userSchema = require("../model/SchemaTest")

async function getExpiryAndStartDate(product) {
  //GET STARTING DATE FOR YEARLY TRIAL
  if (product === "Empower Yearly" || product === "Enhance Yearly"){
    let StartingDate = new Date();
    StartingDate.getMonth() + 1;
    // EXPIRY DATE FOR YEARLY PLAN
    let ExpiryDate = new Date();
    ExpiryDate.setFullYear(ExpiryDate.getFullYear() + 1);
    ExpiryDate.getMonth()  + 1;
    return {StartingDate , ExpiryDate}
  }
  else if (product === "Enhance Monthly" || product === "Empower Monthly") {
    //GET STARTING DATE FOR MONTHLY PLA
    let StartingDate = new Date();
    StartingDate.getMonth() + 1;
    //GET EXPIRY DATE FOR MONTHLY PLAN
    let ExpiryDate = new Date();
    ExpiryDate.setDate(ExpiryDate.getDate() + 30);
    ExpiryDate.getMonth() + 1;
    return {StartingDate , ExpiryDate}
  }

}

// SCHEMA FOR UPDATING OR CREATING NEW PAYMENT OBJECT
async function savePayment(sessionID, customerID, subscriptionID, productName, email, startDate, expiryDate, status) {
  const existingUser = await userSchema.findOne({ email: email });

  var words = 0;
  if (productName === "Empower Yearly") {
    words = 1560000;
  }
  else if (productName === "Enhance Yearly") {
    words = 480000;
  }
  else if (productName === "Empower Monthly") {
    words = 130000;
  }
  else if (productName === "Enhance Monthly") {
    words = 40000;
  }
  
  
  ///REMEMBER I NEEED TO PUT WORDSS HEREEEE......

  try {
    const existingPayment = await paymentSchema.findOne({ email });
    if (existingPayment) {
      existingPayment.sessionID = sessionID.id;
      existingPayment.customerID = customerID;
      existingPayment.subscriptionID = subscriptionID;
      existingPayment.productName = productName;
      existingPayment.email = email;
      existingPayment.startDate = startDate;
      existingPayment.expiryDate = expiryDate;
      existingPayment.status = status;
      existingPayment.words = words;

      await existingPayment.save();
    } 
    else  {
      console.log("Could not add payment data in Database")
    }
  } catch (error) {
    console.error("Error saving payment:", error);
  }
}



router.get("/paymentinfo", async (req, res) => {
  try {
    const existingUser = await paymentSchema.findOne({ email: req.query.email });
    let userEmail = req.query.email;
    if (existingUser) {
      res.status(200).json({
        error: false,
        message: "Payment already in database",
        user: existingUser,
      });
    }
    else if (!existingUser) {
      //GET STARTING DATE FOR FREE TRIAL
      let initialDate = new Date();
      initialDate.getMonth() + 1;
      //GET EXPIRY DATE FOR FREE TRIAL
      let expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() + 30);
      expiredDate.getMonth() + 1;

      const newUser = new paymentSchema({
        sessionID: "",
        customerID: "",
        subscriptionID: "",
        productName: "Support",
        email: userEmail,
        startDate: initialDate,
        expiryDate: expiredDate,
        words: 3000,
        status: "active",
      });

      await newUser.save();

      res.status(200).json({
        error: false,
        message: "Successfully added payment info",
        user: newUser,
      });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      error: true,
      message: "Internal server error",
    });
  }

})

router.get("/success", async (req, res) => {
  await new Promise((resolve) => setTimeout(resolve, 4000));
  const sessionId = req.query.session_id;
  if (!sessionId) {
    return res.status(400).json({ message: "Session ID is required" });
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const customerId = session.customer;
    const customer = await stripe.customers.retrieve(customerId);
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1
    });
    const productID = subscriptions.data[0].plan.product;
    const product = await stripe.products.retrieve(productID);
    subscribedProductName = product.name;
    //GET STARTING DATE FOR YEARLY TRIAL
    const { StartingDate, ExpiryDate } = await getExpiryAndStartDate(product.name);
    await savePayment(session, customerId, subscriptions.data[0].id, product.name, customer.email, StartingDate, ExpiryDate, subscriptions.data[0].status)
    res.json({
      name: customer.name,
      email: customer.email,
      productName: product.name,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "An error occurred" });
  }
});

router.post("/payment-session", async (req, res) => {
  const { name, price , email } = req.body;
  totalPrice = Math.round(Number(price) * 100);

  if (name == "Empower Yearly") {
    try {
      console.log(name);
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        customer_email: email,
        line_items: [
          {
            price: EmpowerYearlyPriceID,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${process.env.BACKEND}/success`,
        cancel_url: `${process.env.BACKEND}/cancel`,
      });
      res.json({ id: session.id });
    } catch (error) {
      res.status(400).send({ error: error.message });
    }
  } else if (name == "Empower Monthly") {
    try {
      console.log(name);
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        customer_email: email,
        line_items: [
          {
            price: EmpowerMonthlyPriceID,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${process.env.BACKEND}/success`,
        cancel_url: `${process.env.BACKEND}/cancel`,
      });
      res.json({ id: session.id });
    } catch (error) {
      console.log("ERROR: ", error.message);
      res.status(400).send({ error: error.message });
    }
  } else if (name == "Enhance Monthly") {
    try {
      console.log(name);
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        customer_email: email,
        line_items: [
          {
            price: EnhanceMonthlyPriceID,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${process.env.BACKEND}/success`,
        cancel_url: `${process.env.BACKEND}/cancel`,
      });
      res.json({ id: session.id });
    } catch (error) {
      console.log("ERROR: ", error.message);
      res.status(400).send({ error: error.message });
    }
  } else if (name == "Enhance Yearly") {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        customer_email: email,
        line_items: [
          {
            price: EnhanceYearlyPriceID,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${process.env.BACKEND}/success`,
        cancel_url: `${process.env.BACKEND}/cancel`,
      });
      res.json({ id: session.id });
    } catch (error) {
      console.log("ERROR: ", error.message);
      res.status(400).send({ error: error.message });
    }
  }
  console.log("here")
});

module.exports = router;