export default async function handler(req, res) {
  console.log("API hit:", req.method);

  // if (req.method === 'GET') {
  //   return res.status(200).json({ message: 'Button API online ✅' });
  // }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.API_KEY}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { button, status } = req.body;
  if (!button || !status) {
    return res.status(400).json({ message: 'Missing button or status' });
  }

  try {
    // Update Firestore
    await setDoc(doc(db, "buttons", button), { status });

    return res.status(200).json({ message: 'Button state updated ✅' });
  } catch (err) {
    console.error("Firestore error:", err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
