import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: "AIzaSyDiYNFFyKmjhViYMo9YPPcZGSuNTqX2Ido",
  authDomain: "humanlib-e647f.firebaseapp.com",
  projectId: "humanlib-e647f",
  storageBucket: "humanlib-e647f.firebasestorage.app",
  messagingSenderId: "207013774871",
  appId: "1:207013774871:web:6a3e2524b6d7e0e4677e52",
  measurementId: "G-XN1WM6QKVX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default async function handler(req, res) {
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
    await setDoc(doc(db, 'button_state', button), { status, timestamp: Date.now() });
    return res.status(200).json({ message: 'Button state updated' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
