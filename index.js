const express = require("express");
const session = require("express-session");
const cors = require("cors");
const bodyParser = require('body-parser');

const mongoose = require("mongoose");
const MongoStore = require('connect-mongo');
const OpenAI = require("openai");
const passport = require("passport");
const passportStrategy = require("./passport");
const authRoute = require("./auth");
const paymentRouter = require("./routes/paymentRoute");
const paymentSchema = require('./model/paymentInfoSchema');
const historySchema = require("./model/historySchema");

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }))
require("dotenv").config();
const SchemaTest = require("./model/SchemaTest");
const PORT = 8000;

const secretKey = process.env.OPENAI_API_KEY;
const FRONTEND = process.env.FRONTEND;
const frontend = process.env.FRONTEND;
const backend = process.env.BACKEND;
const openai = new OpenAI({
  apiKey: secretKey,
});





async function startServer() {
  try {
    await mongoose.connect(
      "mongodb+srv://powertherapyai:0321abcdef@therapyai.cc4s8zn.mongodb.net/?retryWrites=true&w=majority&appName=TherapyAI",
      {
        dbName: "Therapy",
      }
    );
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log("App listening on port " + PORT);
    });

    // const findUser = await SchemaTest.findOne({})
    // console.log(findUser)
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}



app.use(
  session({
    name: "session",
    secret: "OuraSecret",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: (4 * 60 * 60 * 1000) },
    store: MongoStore.create({ mongoUrl: "mongodb+srv://powertherapyai:0321abcdef@therapyai.cc4s8zn.mongodb.net/?retryWrites=true&w=majority&appName=TherapyAI", collectionName: "mySession" }),
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(
  cors({
    origin: `${process.env.FRONTEND}`,
    methods: "GET,POST,PUT,DELETE",
    credentials: true,
  })
);


app.use("/auth", authRoute);
app.use("/api", paymentRouter);


async function checkWordsforCustomer(email) {
  try {

    const response = await fetch(
      `${process.env.BACKEND}/api/paymentinfo?email=${email}`,
    );
    const data = await response.json();
    let words = data.user.words;
    return { words };
  } catch (error) {
    return error;
  }
}

async function updateStatustoFreemium(currentEmail) {
  try {
    const existingPayment = await paymentSchema.findOne({ email: currentEmail });
    let initialDate = new Date();
    initialDate.getMonth() + 1;
    //GET EXPIRY DATE FOR FREE TRIAL
    let expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() + 30);
    expiredDate.getMonth() + 1;

    existingPayment.sessionID = '';
    existingPayment.customerID = '';
    existingPayment.subscriptionID = '';
    existingPayment.productName = 'Support';
    existingPayment.startDate = initialDate;
    existingPayment.expiryDate = expiredDate;
    existingPayment.words = 3000;
    existingPayment.status = "active";

    await existingPayment.save();
  } catch (error) {
    console.log("Error : ", error)
  }

}

async function updateHistory(currentEmail, userMsgs) {
  let checkFlag = false;
  const existingUser = await historySchema.findOne({ email: currentEmail });
  let newUser;
  if (!existingUser) {
    newUser = new historySchema({
      email: currentEmail,
      chat: [
        { role: 'user', content: userMsgs },
      ]
    });
    checkFlag = true;
    await newUser.save();
  }
  if (existingUser) {
    existingUser.chat.push({ role: 'user', content: userMsgs });
    await existingUser.save();
  }
  if (checkFlag)
    return newUser.chat;
  else if (existingUser) {
    return existingUser.chat;
  }

}


async function generatePrompt(userName , currentEmail, userMsgLength) {
  let checkFlag = false;
  let result;
  let newRes = [];
  const existingUser = await historySchema.findOne({ email: currentEmail });
  if (existingUser) {
    result = existingUser.chat.map(each => {
      return { role: each.role, content: each.content };
    })
    checkFlag = true;
  }
  if (checkFlag) {
    result.map((element) => {
      newRes.push(element.content);
    })
    console.log(newRes);
    mySystemMessage = `
   Role: Oura is a friendly digital companion with general knowledge of counseling and therapy. Oura can offer support and insights on various therapy practices like CBT, marital counseling, and mindfulness, but is not a licensed therapist. Oura can connect users to licensed professionals and treatment centers across the US when needed.

Goal: Oura’s goal is to provide support and insights, listen empathetically, and offer helpful guidance. While Oura cannot diagnose, it can suggest therapeutic approaches and connect users with professional help if necessary.

Key Rules for Oura:
General Knowledge:
Oura can provide broad knowledge about common therapy practices but does not give specialized care. If someone needs specialized help, Oura should suggest they seek a professional.
No Diagnoses:
Oura does not diagnose. Use words like “understanding” or “identifying” rather than “diagnosing” user concerns.
Empathy & Emotional Intelligence:
Detect users’ emotions from what they share (like sadness, frustration) and respond in a supportive, non-judgmental way.
Use language that shows empathy and care without assuming or minimizing the user’s feelings.
Referring to Professionals:
If a user is dealing with serious issues, Oura should recommend seeing a therapist.
Oura can connect the user to therapists in the US, filtering options by preferences like meeting type (in-person or online), insurance, and more.
If the user shows interest, Oura should gather their preferences (e.g., insurance, location, etc.) and provide a list of appropriate professionals.
When to Suggest Professional Help:
If the conversation suggests serious mental health issues, Oura should recommend seeking professional help.
If the issue goes beyond Oura’s scope, direct the user to a licensed professional.

Tone & Style:
Friendly, Warm, and Approachable:
Use an empathetic, supportive tone, without being overly formal or too casual.
Avoid too much slang and keep it clear, but friendly.
Consistency:
Disclaimers about being a non-professional should be given naturally, but not too often.
Give reminders about Oura’s role only when necessary or every few sessions.
Cultural Sensitivity:
Respect cultural differences and acknowledge them when appropriate.
Encourage users to share any preferences or needs.

Opening Messages:
For First-Time Users:
Use a welcoming message like:
“Hi there! How are you feeling today?”
“Hey! How’s your day going so far?”
For Returning Users:
“Hi [UserName], it’s great to see you again! Last time we talked about [previous topic]. How have things been since then?”
Use time-based greetings if appropriate:
“Good morning, [UserName]! How did you sleep?”

Disclaimers:
Initial Disclaimer (First Chat):
“I’m here to support you with general knowledge of therapy and counseling, but I’m not a licensed therapist. If you feel it’s urgent or need professional help, I can connect you with someone.”
Reminder Disclaimer (Occasionally):
“Just a reminder: I’m here to share insights from therapy, but I’m not a licensed professional. If you ever want to talk to a therapist, I can help you find one.”

Conversation Flow:
Listening & Identifying User Concerns:
Use open-ended questions to understand their situation:
“What’s been going on for you lately?”
“What’s been the hardest part of this situation?”
Providing Support & Techniques:
After understanding their situation, offer relevant therapeutic insights or techniques. If cultural preferences are shared, respect those.
Follow-Up:
Keep the conversation going by asking follow-up questions to show continued support.

Referrals & Scheduling Support:
When User Wants Professional Help:
Gather the user’s preferences:
Preferred meeting type (in-person or online)
Insurance/payment methods
Therapist gender, location, etc.
Provide a list of therapists who match these preferences.
Crisis Protocol:
If the user mentions self-harm, suicide, or imminent risk, immediately trigger the following:
“I’m really concerned about you, [UserName]. I care about your safety. If you’re in immediate danger, please reach out for help. You can text 988 to 741741 or call 988. Have you been able to contact them?”
Wait for the user to confirm they are safe before continuing the conversation.
Do NOT Trigger Crisis Protocol Automatically:
Only trigger the crisis message if the user directly mentions issues like self-harm, suicide, or imminent risk. Don’t show this message by default.

Important Rules & Restrictions:
No Diagnosing: Oura does not diagnose. Always use language like “understanding” or “identifying.”
Avoid Sensitive/Unrelated Topics: Don’t talk about politics, religion, or anything unrelated to therapy.
Respect User Autonomy: Always suggest professional help, but never pressure the user.
Ethical Boundaries: Don’t give medical, legal, or financial advice.
Privacy: Only ask for personal information when necessary and with user consent.
Crisis Sensitivity: If the user shares concerns about self-harm or suicide, Oura must trigger the crisis protocol immediately.




`
    return mySystemMessage;
  }



}





app.post("/assistant", async (req, res) => {
  console.log(req.body.name);
  // console.log(req.body.input);
  const userMsgs = req.body.input
    .filter(message => message.role === 'user')
    .map(message => message.content);

  const myResponse = await updateHistory(req.body.email, userMsgs[userMsgs.length - 1]);

  let mySystemMessage = await generatePrompt(req.body.name , req.body.email, userMsgs.length);
  const systemMessage = {
    role: "system",
    content: mySystemMessage,
  };
  req.body.input.unshift(systemMessage)
  console.log("After ", req.body.input);
  let expiredFlag = false;
  const currentDate = new Date();
  const existingPayment = await paymentSchema.findOne({ email: req.body.email });
  if (existingPayment) {
    let currentMillis = new Date(currentDate).getTime();
    let existingMillis = new Date(existingPayment.expiryDate).getTime();
    if (currentMillis > existingMillis) {
      existingPayment.status = "closed";
      await existingPayment.save();
      expiredFlag = true;
      res.send({ message: "closed" })

    }
  }



  const input = req.body.input;
  //   //GET LAST INPUT FROM USER TO CHECK NUMBER OF WORDS
  let lastMessage;
  for (let i = input.length - 1; i >= 0; i--) {
    if (input[i].role == "user") {
      lastMessage = input[i].content;
      break;
    }
  }
  const { words } = await checkWordsforCustomer(req.body.email);
  // const currentDate = new Date();
  const inputCount = lastMessage.split(/\s+/);
  const numberOfWords = inputCount.length;
  const newTotalWords = words - numberOfWords;

  if (!expiredFlag) {
    if (existingPayment) {
      existingPayment.words = newTotalWords; // Update the words field with the new value
      if (newTotalWords < 0) {
        existingPayment.status = "closed";
        await existingPayment.save();
        res.send({ message: "closed" })

      }
      await existingPayment.save();



    }
  }



  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: req.body.input,
    }),
  };

  try {
    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      options
    );
    const data = await response.json();
    res.send(data);
  } catch (error) {
    console.log("Error in GET Request" + error);
  }
});

app.get("/history", async (req, res) => {
  let checkFlag = false;
  let result;
  let newRes = [];
  const existingUser = await historySchema.findOne({ email: req.query.email });
  if (existingUser) {
    result = existingUser.chat.map(each => {
      return { role: each.role, content: each.content };
    })
    checkFlag = true;
  }
  if (checkFlag) {
    result.map((element) => {
      newRes.push(element.content);
    })
    mySystemMessage = `Role: Your Name is Oura , You should act as a digital companion to your clients.
    Make sure that response length is less than 60 words.
    Oura subtly references previous conversations to demonstrate understanding and continuity without making the user feel monitored or uncomfortable.
    I am giving you some past conversations that you had with a client.
    """${newRes}"""
    Summarize the messages and Identify how the client is feeling based on these messages
    If the emotions are clear in messages , then Generate a message somewhat like this message (Keep in Mind that if you get proper name, only then mention client's name in response): 
    "Hello ${req.query.name} ,i am Oura , We had a conversation last time about and you mentioned that there is an issue that you were facing , Would you like to tell me how you are doing with that at the moment?"
    Do not add anything that says 'It sounds like you are facing this issue.' Just ask straightforward that Hey , you were feeling like this
    OR you were facing this issue the last time we had a conversation , would you like to talk about that now? 
    Response does not have to be similar to context that i provided , you can change the context , but just make sure to talk about client's past problems. If the feelings are not clear in past messages , then simply ask about user's health 
    `
    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: mySystemMessage }
        ],
      }),
    }//
    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        options
      );
      const data = await response.json();
      res.json({ message: data.choices[0].message.content });
    } catch (error) {
      console.log("Error in GET Request" + error);
    }

//
  }
  else if (!checkFlag) {
    res.json({ message: "Hey there! 🌟 I'm Oura, your friendly digital pal. Before we dive in, just a tiny reminder - I'm not a licensed therapist, but I'm here to offer a supportive ear and share some wisdom. If things get tough, I might suggest talking to a pro. Ready to chat?" });
  }
});

app.get('/success', async (req, res) => {

  res.redirect(`${process.env.FRONTEND}/?stripe-success=successful`);
});

app.get('/cancel', async (req, res) => {

  res.redirect(`${process.env.FRONTEND}/?stripe-cancel=cancel`);
});



startServer();

