import { connectDB, getAlertSubscriberModel } from "./_lib/db.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getRequestBody(req) {
  if (!req.body) {
    return {};
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return req.body;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectDB();

    const body = getRequestBody(req);
    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    const AlertSubscriber = getAlertSubscriberModel();
    const now = new Date();

    await AlertSubscriber.findOneAndUpdate(
      { email },
      {
        $set: {
          email,
          isActive: true,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    return res.status(200).json({
      ok: true,
      message: "You are subscribed to promotion alerts.",
    });
  } catch (error) {
    console.error("alerts-subscribe error:", error);
    return res.status(500).json({ error: "Could not save subscription." });
  }
}
