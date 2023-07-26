require("dotenv").config();
const express = require("express");
    const stripe = require("stripe")(process.env.STRIPE_SCERATE_KEY);
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");

const app = express();

app.use(express.json());
app.use(express.static("public"));

const storeItems = new Map([
  [1, { priceInCents: 5000 * 100, name: "red color" }],
  [2, { priceInCents: 3000 * 100, name: "Blue color" }],
]);

app.post("/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"], // Payment method types should be plural: payment_method_types
      line_items: req.body.items.map((item) => {
        const storeItem = storeItems.get(item.id);
        return {
          price_data: {
            currency: "INR",
            product_data: {
              name: storeItem.name,
            },
            unit_amount: storeItem.priceInCents,
          },
          quantity: item.quantity,
        };
      }),
      mode: "payment",
      success_url: `${process.env.SERVER_URL}/success.html`,
      cancel_url: `${process.env.SERVER_URL}/cancle.html`,
    });
    // console.log(session,"session")
    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const endpointSecret = "whsec_53nNpDY23GxN02XRA71oHJ4iFJekWZwt";

app.use(bodyParser.json({ type: "application/json" }));

app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (request, response) => {
    const sig = request.headers["stripe-signature"];
    console.log("sig--", sig);

    let event;

    try {

      const payloadString = JSON.stringify(request.body, null, 2);
      const secret = "whsec_53nNpDY23GxN02XRA71oHJ4iFJekWZwt";

      const header = stripe.webhooks.generateTestHeaderString({
        payload: payloadString,
        secret,
      });

       event = stripe.webhooks.constructEvent(
        payloadString,
        header,
        secret
      );
      console.log(event, "eventvalue");
    } catch (err) {
      response.status(400).send(`Webhook Error123: ${err.message}`);
      return;
    }
    let session = "";
    // Handle the event


   
    switch (event.type) {
      case "checkout.session.async_payment_failed":
        session = event.data.object;
        // Then define and call a function to handle the event checkout.session.async_payment_failed
        break;
      case "checkout.session.completed":
        session = event.data.object;
        let emailTo = session.customer_details.email;

        console.log(session, "session");

          const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
              // TODO: replace `user` and `pass` values from <https://forwardemail.net>
              user: 'deep.zotech@gmail.com',
              pass: 'wenmojvuljinggzv',
            },
            tls: {
              rejectUnauthorized: false,
            },

          });

          const info = await transporter.sendMail({
            from: process.env.email, // sender address
            to: emailTo, // list of receivers
            subject: "Thanks for the Payment", // Subject line
            text: "Thanks for the Payment", // plain text body
            html: `
            Hello ${session.customer_details.email} Thanks For the Payment for the project
            `, // html body
          });

          console.log("Message sent: %s", info);
        // Then define and call a function to handle the event checkout.session.async_payment_succeeded
        break;
      case "checkout.session.async_payment_succeeded":
        session = event.data.object;
        console.log("async_payment_succeeded");
        // Then define and call a function to handle the event checkout.session.completed
        break;
      case "checkout.session.expired":
        session = event.data.object;
        // Then define and call a function to handle the event checkout.session.expired
        break;
      // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    response.send();
  }
);

app.listen(3000, () => {
  console.log("Server running port on 3000");
});
